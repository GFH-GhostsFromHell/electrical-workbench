package com.example.remoteportal.config;

import com.example.remoteportal.service.ClientAccountStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.oidc.user.*;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import org.springframework.security.web.SecurityFilterChain;

import java.util.*;

@Configuration
public class SecurityConfig {
  @Bean PasswordEncoder encoder(){return new BCryptPasswordEncoder();}

  @Bean
  ClientRegistrationRepository clientRegistrationRepository(
      @Value("${GOOGLE_CLIENT_ID:}") String clientId,
      @Value("${GOOGLE_CLIENT_SECRET:}") String clientSecret) {
    if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
      return registrationId -> null;
    }
    ClientRegistration google = CommonOAuth2Provider.GOOGLE.getBuilder("google")
        .clientId(clientId.trim())
        .clientSecret(clientSecret.trim())
        .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
        .scope("openid", "profile", "email")
        .build();
    return new InMemoryClientRegistrationRepository(google);
  }

  @Bean
  OAuth2UserService<OidcUserRequest, OidcUser> googleOidcUserService(ClientAccountStore accounts) {
    OidcUserService delegate = new OidcUserService();
    return request -> {
      OidcUser google = delegate.loadUser(request);
      if (!Boolean.TRUE.equals(google.getEmailVerified())
          || google.getEmail() == null || google.getEmail().isBlank()) {
        throw new OAuth2AuthenticationException(new OAuth2Error("unverified_email"),
            "The Google account must provide a verified email address.");
      }

      String localUsername;
      try {
        HttpSession session = null;
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes webRequest)
          session = webRequest.getRequest().getSession(false);

        String pending = session == null ? null : (String) session.getAttribute("googleLinkAccount");
        Long issued = session == null ? null : (Long) session.getAttribute("googleLinkIssuedAt");
        if (pending != null) {
          // Single-use link request made after the user re-entered their password.
          session.removeAttribute("googleLinkAccount");
          session.removeAttribute("googleLinkIssuedAt");
          if (issued == null || issued > Instant.now().getEpochSecond()
              || Instant.now().getEpochSecond() - issued > 300)
            throw new IllegalStateException("The Google linking request expired. Start again from your profile.");
          localUsername = accounts.linkGoogleAccount(pending, google.getEmail(), google.getSubject());
        } else {
          localUsername = accounts.ensureGoogleAccount(google.getEmail(), google.getFullName(), google.getSubject());
        }
      } catch (RuntimeException failure) {
        throw new OAuth2AuthenticationException(new OAuth2Error("google_account_unavailable"),
            "Google sign-in could not be completed. If you have a password account, sign in first and connect Google from your profile.",
            failure);
      }

      Set<GrantedAuthority> authorities = new LinkedHashSet<>(google.getAuthorities());
      authorities.add(new SimpleGrantedAuthority("ROLE_CLIENT"));
      // Spring's default Google principal name is the OIDC subject or email.
      // All existing portal APIs use the LOCAL username as their account key.
      // Expose the local username while preserving signed Google ID token claims.
      if (google.getUserInfo() != null)
        return new LocalOidcUser(authorities, google.getIdToken(), google.getUserInfo(), localUsername);
      return new LocalOidcUser(authorities, google.getIdToken(), localUsername);
    };
  }

  static final class LocalOidcUser extends DefaultOidcUser {
    private final String localUsername;
    LocalOidcUser(Collection<? extends GrantedAuthority> authorities,
        org.springframework.security.oauth2.core.oidc.OidcIdToken idToken,
        org.springframework.security.oauth2.core.oidc.OidcUserInfo info,
        String localUsername) {
      super(authorities, idToken, info, "sub");
      this.localUsername=localUsername;
    }
    LocalOidcUser(Collection<? extends GrantedAuthority> authorities,
        org.springframework.security.oauth2.core.oidc.OidcIdToken idToken, String localUsername) {
      super(authorities, idToken, "sub");
      this.localUsername=localUsername;
    }
    @Override public String getName() { return localUsername; }
  }

  @Bean
  UserDetailsService users(
      @Value("${app.admin.username:admin}") String adminUser,
      @Value("${app.admin.password:change-me-now}") String adminPassword,
      PasswordEncoder encoder,
      ClientAccountStore clientAccounts) {
    UserDetails admin = User.withUsername(adminUser)
        .password(encoder.encode(adminPassword))
        .roles("ADMIN")
        .build();
    return username -> {
      if (adminUser.equalsIgnoreCase(username)) return admin;
      return clientAccounts.loadUserByUsername(username);
    };
  }

  @Bean
  SecurityFilterChain filter(HttpSecurity http, OAuth2UserService<OidcUserRequest, OidcUser> googleOidcUserService) throws Exception {
    http.csrf(csrf->csrf.ignoringRequestMatchers("/api/**", "/login", "/logout"))
      .authorizeHttpRequests(a->a
        .requestMatchers("/", "/index.html", "/account.html", "/management/health", "/actuator/health", "/api/public/**", "/oauth2/**", "/login/oauth2/**").permitAll()
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .requestMatchers("/api/client/**", "/api/profile/**", "/portal.html").hasAnyRole("CLIENT", "ADMIN")
        .anyRequest().authenticated())
      .formLogin(f->f
        .loginPage("/")
        .loginProcessingUrl("/login")
        .defaultSuccessUrl("/portal.html", true)
        .failureUrl("/?error=1")
        .permitAll())
      .oauth2Login(o->o
        .loginPage("/")
        .userInfoEndpoint(u->u.oidcUserService(googleOidcUserService))
        .defaultSuccessUrl("/portal.html", true)
        .failureUrl("/?googleError=1"))
      .logout(l->l.logoutUrl("/logout").logoutSuccessUrl("/").permitAll())
      .httpBasic(Customizer.withDefaults());
    return http.build();
  }
}
