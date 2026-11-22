package com.example.remoteportal.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ClientAccountStore {
  public static final List<String> TIERS = List.of("TIER_1", "TIER_2", "TIER_3", "TIER_4");

  private final JdbcTemplate db;
  private final PasswordEncoder encoder;
  private final String seedUsername;
  private final String seedPassword;
  private final String seedDisplayName;

  public ClientAccountStore(
      JdbcTemplate db,
      PasswordEncoder encoder,
      @Value("${app.client.seed.username:bryn}") String seedUsername,
      @Value("${app.client.seed.password:CHANGE_ME_CLIENT_2026}") String seedPassword,
      @Value("${app.client.seed.display-name:Bryn Flewelling}") String seedDisplayName) {
    this.db = db;
    this.encoder = encoder;
    this.seedUsername = seedUsername;
    this.seedPassword = seedPassword;
    this.seedDisplayName = seedDisplayName;
  }

  @PostConstruct
  void init() {
    db.execute("create table if not exists client_account (username varchar(255) primary key, display_name varchar(255), password_hash varchar(255) not null, enabled boolean not null)");
    db.execute("alter table client_account add column if not exists email varchar(255)");
    db.execute("alter table client_account add column if not exists subscription_tier varchar(20) default 'TIER_1'");
    db.execute("alter table client_account add column if not exists avatar_data text");
    db.execute("alter table client_account add column if not exists auth_provider varchar(32) default 'PASSWORD'");
    db.execute("alter table client_account add column if not exists google_subject varchar(255)");
    db.execute("alter table client_account add column if not exists email_verified boolean default false");
    db.execute("create unique index if not exists client_account_google_subject_unique on client_account(google_subject)");
    db.update("update client_account set subscription_tier='TIER_1' where subscription_tier is null or subscription_tier='' ");
    db.update("update client_account set auth_provider='PASSWORD' where auth_provider is null or auth_provider='' ");

    Integer count = db.queryForObject("select count(*) from client_account where lower(username)=lower(?)", Integer.class, seedUsername);
    if (count != null && count == 0) {
      db.update("insert into client_account(username,display_name,password_hash,enabled,email,subscription_tier,avatar_data,auth_provider,google_subject) values(?,?,?,?,?,?,?,?,?)",
          seedUsername, seedDisplayName, encoder.encode(seedPassword), true, null, "TIER_1", null, "PASSWORD", null);
    }
  }

  public UserDetails loadUserByUsername(String username) {
    List<UserDetails> users = db.query(
        "select username,password_hash,enabled from client_account where lower(username)=lower(?) or (email is not null and lower(email)=lower(?)) order by case when lower(username)=lower(?) then 0 else 1 end, username limit 1",
        (rs, row) -> User.withUsername(rs.getString("username"))
            .password(rs.getString("password_hash"))
            .roles("CLIENT")
            .disabled(!rs.getBoolean("enabled"))
            .build(), username, username, username);
    if (users.isEmpty()) throw new UsernameNotFoundException(username);
    return users.getFirst();
  }

  /**
   * Google identity is bound to the immutable OpenID Connect subject, NOT an email
   * matching a password account. An unrelated Google identity cannot auto-link to
   * an existing password account, even if its email address matches.
   */
  public synchronized String ensureGoogleAccount(String email, String displayName, String googleSubject) {
    String verifiedEmail = verifiedGoogleEmail(email);
    String subject = requireGoogleSubject(googleSubject);
    String name = (displayName == null || displayName.isBlank()) ? verifiedEmail : displayName.trim();

    List<GoogleAccount> matched = db.query(
        "select username,enabled from client_account where google_subject=?",
        (rs,row)->new GoogleAccount(rs.getString("username"),rs.getBoolean("enabled")),subject);
    if (!matched.isEmpty()) {
      GoogleAccount existing = matched.getFirst();
      if (!existing.enabled()) throw new IllegalStateException("This account is disabled. Contact support.");
      Integer collision=db.queryForObject(
          "select count(*) from client_account where (lower(username)=? or (email is not null and lower(email)=?)) and username<>?",
          Integer.class,verifiedEmail,verifiedEmail,existing.username());
      if(collision!=null&&collision>0)
        throw new IllegalStateException("This Google email is already assigned to another account. Contact support.");
      db.update("update client_account set display_name=?,email=?,email_verified=true where username=?",
          name,verifiedEmail,existing.username());
      return existing.username();
    }

    Integer existing=db.queryForObject(
        "select count(*) from client_account where lower(username)=? or (email is not null and lower(email)=?)",
        Integer.class,verifiedEmail,verifiedEmail);
    if(existing!=null&&existing>0)
      throw new IllegalStateException("An account with this email already exists. Sign in with its current method before connecting Google.");

    String unusablePassword=encoder.encode(UUID.randomUUID()+":google-only:"+UUID.randomUUID());
    db.update("insert into client_account(username,display_name,email,password_hash,enabled,subscription_tier,avatar_data,auth_provider,google_subject,email_verified) values(?,?,?,?,?,?,?,?,?,?)",
        verifiedEmail,name,verifiedEmail,unusablePassword,true,"TIER_1",null,"GOOGLE",subject,true);
    return verifiedEmail;
  }

  /**
   * Called only after a signed-in password user has reauthenticated and completed
   * Google's OIDC flow in the same short-lived server session.
   */
  public synchronized String linkGoogleAccount(String localUsername, String googleEmail, String googleSubject) {
    String email=verifiedGoogleEmail(googleEmail);
    String subject=requireGoogleSubject(googleSubject);
    List<GoogleLinkTarget> targets=db.query(
        "select username,email,enabled,auth_provider from client_account where lower(username)=lower(?)",
        (rs,row)->new GoogleLinkTarget(rs.getString("username"),rs.getString("email"),
            rs.getBoolean("enabled"),rs.getString("auth_provider")),localUsername);
    if(targets.isEmpty()||!targets.getFirst().enabled())
      throw new IllegalStateException("This account cannot be linked.");
    GoogleLinkTarget target=targets.getFirst();
    if(target.email()==null||!email.equalsIgnoreCase(target.email()))
      throw new IllegalStateException("The Google account email must match the email on the Electrical Workbench profile.");
    if(!"PASSWORD".equalsIgnoreCase(target.provider()) && !"PASSWORD_GOOGLE".equalsIgnoreCase(target.provider()))
      throw new IllegalStateException("This account cannot be linked using a password.");
    Integer subjectTaken=db.queryForObject(
        "select count(*) from client_account where google_subject=? and username<>?",
        Integer.class,subject,target.username());
    if(subjectTaken!=null&&subjectTaken>0)
      throw new IllegalStateException("This Google account is already connected to another user.");
    db.update("update client_account set google_subject=?,auth_provider='PASSWORD_GOOGLE',email_verified=true where username=?",
        subject,target.username());
    return target.username();
  }

  public void requirePasswordForGoogleLink(String username,String password) {
    List<GoogleLinkTarget> targets=db.query(
        "select username,email,enabled,auth_provider from client_account where lower(username)=lower(?)",
        (rs,row)->new GoogleLinkTarget(rs.getString("username"),rs.getString("email"),
            rs.getBoolean("enabled"),rs.getString("auth_provider")),username);
    if(targets.isEmpty()||!targets.getFirst().enabled())
      throw new IllegalArgumentException("Account cannot be linked.");
    GoogleLinkTarget target=targets.getFirst();
    if(!"PASSWORD".equalsIgnoreCase(target.provider()) && !"PASSWORD_GOOGLE".equalsIgnoreCase(target.provider()))
      throw new IllegalArgumentException("Only password accounts can use this linking method.");
    if(target.email()==null||target.email().isBlank())
      throw new IllegalArgumentException("Add an email to your profile before connecting Google.");
    List<String> hashes=db.query("select password_hash from client_account where username=?",
        (rs,row)->rs.getString(1),target.username());
    if(hashes.isEmpty()||password==null||!encoder.matches(password,hashes.getFirst()))
      throw new IllegalArgumentException("The current password is incorrect.");
  }

  private static String verifiedGoogleEmail(String email) {
    String normalized=email==null?"":email.trim().toLowerCase(Locale.ROOT);
    if(normalized.isBlank()||normalized.length()>255||!normalized.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
      throw new IllegalArgumentException("Google did not provide a valid verified email.");
    return normalized;
  }
  private static String requireGoogleSubject(String subject) {
    if(subject==null||subject.isBlank()||subject.length()>255)
      throw new IllegalArgumentException("Google did not provide a valid account identity.");
    return subject;
  }
  private record GoogleAccount(String username,boolean enabled) {}
  private record GoogleLinkTarget(String username,String email,boolean enabled,String provider) {}

  public List<Map<String,Object>> list() {
    return db.query("select username,display_name,email,enabled,subscription_tier,auth_provider from client_account order by username", (rs,row) -> {
      Map<String,Object> m = new LinkedHashMap<>();
      m.put("username", rs.getString("username"));
      m.put("displayName", rs.getString("display_name"));
      m.put("email", rs.getString("email"));
      m.put("enabled", rs.getBoolean("enabled"));
      m.put("subscriptionTier", rs.getString("subscription_tier"));
      m.put("authProvider", rs.getString("auth_provider"));
      return m;
    });
  }

  public Map<String,Object> get(String username) {
    return db.query("select username,display_name,email,enabled,subscription_tier,avatar_data,auth_provider from client_account where lower(username)=lower(?)", rs -> {
      if (!rs.next()) throw new UsernameNotFoundException(username);
      Map<String,Object> m = new LinkedHashMap<>();
      m.put("username", rs.getString("username"));
      m.put("displayName", rs.getString("display_name"));
      m.put("email", rs.getString("email"));
      m.put("enabled", rs.getBoolean("enabled"));
      m.put("subscriptionTier", rs.getString("subscription_tier"));
      m.put("avatarData", rs.getString("avatar_data"));
      m.put("authProvider", rs.getString("auth_provider"));
      return m;
    }, username);
  }

  public String tier(String username) {
    List<String> rows = db.query("select subscription_tier from client_account where lower(username)=lower(?)",
        (rs,row) -> rs.getString(1), username);
    if (rows.isEmpty() || rows.getFirst() == null || rows.getFirst().isBlank()) return "TIER_1";
    return rows.getFirst();
  }

  public void upsert(String username, String displayName, String email, String password, boolean enabled, String tier) {
    String normalizedTier = normalizeTier(tier);
    Integer count = db.queryForObject("select count(*) from client_account where lower(username)=lower(?)", Integer.class, username);
    if (count != null && count > 0) {
      if (password != null && !password.isBlank()) {
        db.update("update client_account set display_name=?,email=?,password_hash=?,enabled=?,subscription_tier=?,auth_provider='PASSWORD' where lower(username)=lower(?)",
            displayName, email, encoder.encode(password), enabled, normalizedTier, username);
      } else {
        db.update("update client_account set display_name=?,email=?,enabled=?,subscription_tier=? where lower(username)=lower(?)",
            displayName, email, enabled, normalizedTier, username);
      }
    } else {
      if (password == null || password.isBlank()) throw new IllegalArgumentException("Password required for new client account");
      db.update("insert into client_account(username,display_name,email,password_hash,enabled,subscription_tier,avatar_data,auth_provider,google_subject) values(?,?,?,?,?,?,?,?,?)",
          username, displayName, email, encoder.encode(password), enabled, normalizedTier, null, "PASSWORD", null);
    }
  }

  public void updateProfile(String username, String displayName, String email, String avatarData) {
    if (avatarData != null && avatarData.length() > 2_500_000) throw new IllegalArgumentException("Profile picture is too large");
    int n = db.update("update client_account set display_name=?,email=?,avatar_data=? where lower(username)=lower(?)", displayName, email, avatarData, username);
    if (n == 0) throw new UsernameNotFoundException(username);
  }

  public void changePassword(String username, String currentPassword, String newPassword) {
    if (newPassword == null || newPassword.length() < 8) throw new IllegalArgumentException("New password must be at least 8 characters");
    List<String> providers = db.query("select auth_provider from client_account where lower(username)=lower(?)", (rs,row)->rs.getString(1), username);
    if (!providers.isEmpty() && "GOOGLE".equalsIgnoreCase(providers.getFirst())) {
      throw new IllegalArgumentException("This account signs in with Google. Password changes are not available for Google-only accounts.");
    }
    List<String> hashes = db.query("select password_hash from client_account where lower(username)=lower(?)", (rs,row) -> rs.getString(1), username);
    if (hashes.isEmpty()) throw new UsernameNotFoundException(username);
    if (currentPassword == null || !encoder.matches(currentPassword, hashes.getFirst())) throw new IllegalArgumentException("Current password is incorrect");
    db.update("update client_account set password_hash=? where lower(username)=lower(?)", encoder.encode(newPassword), username);
  }

  private static String normalizeTier(String tier) {
    String t = tier == null || tier.isBlank() ? "TIER_1" : tier.toUpperCase(Locale.ROOT);
    if (!TIERS.contains(t)) throw new IllegalArgumentException("Invalid subscription tier");
    return t;
  }
}
