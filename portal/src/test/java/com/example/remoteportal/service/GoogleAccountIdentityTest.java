package com.example.remoteportal.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class GoogleAccountIdentityTest {
  private JdbcTemplate db;
  private ClientAccountStore accounts;

  @BeforeEach
  void setup(){
    String url="jdbc:h2:mem:gacct_"+UUID.randomUUID().toString().replace("-","")+";DB_CLOSE_DELAY=-1";
    db=new JdbcTemplate(new DriverManagerDataSource(url,"sa",""));
    accounts=new ClientAccountStore(db,new BCryptPasswordEncoder(),"seedUser","local-password-123","Seed");
    accounts.init();
  }

  @Test void verifiedGoogleNewSignupGetsTierOneAndStableSubject(){
    String username=accounts.ensureGoogleAccount(" NewUser@Example.com ","New User","google-sub-001");
    assertEquals("newuser@example.com",username);
    Map<String,Object> profile=accounts.get(username);
    assertEquals("TIER_1",profile.get("subscriptionTier"));
    assertEquals("GOOGLE",profile.get("authProvider"));
    assertEquals(true,db.queryForObject("select email_verified from client_account where username=?",Boolean.class,username));
    assertEquals("google-sub-001",db.queryForObject("select google_subject from client_account where username=?",String.class,username));
    assertEquals(username,accounts.ensureGoogleAccount("NEWUSER@example.com","Updated","google-sub-001"));
    assertEquals("Updated",accounts.get(username).get("displayName"));
  }

  @Test void GoogleIdentityChangeEmailPreservesOriginalUsernameAndSubscription(){
    String username=accounts.ensureGoogleAccount("worker@example.com","Worker","immutable-sub");
    db.update("update client_account set subscription_tier='TIER_3' where username=?",username);
    assertEquals(username,accounts.ensureGoogleAccount("newaddress@example.com","Worker","immutable-sub"));
    assertEquals("TIER_3",accounts.tier(username));
    assertEquals("newaddress@example.com",accounts.get(username).get("email"));
    assertEquals(username,accounts.get(username).get("username"));
  }

  @Test void matchingEmailNeverAutomaticallyTakesOverPasswordAccount(){
    accounts.upsert("licensedworker","Worker","worker@example.com","existing-pass-123",true,"TIER_2");
    assertThrows(IllegalStateException.class,
        ()->accounts.ensureGoogleAccount("worker@example.com","Wrong identity","attacker-google-sub"));
    assertEquals("PASSWORD",accounts.get("licensedworker").get("authProvider"));
    assertEquals("TIER_2",accounts.tier("licensedworker"));
    assertNull(db.queryForObject("select google_subject from client_account where username='licensedworker'",String.class));
  }

  @Test void disabledAccountsStayDisabledOnGoogleLogin(){
    String username=accounts.ensureGoogleAccount("worker@example.com","Worker","worker-sub");
    db.update("update client_account set enabled=false where username=?",username);
    assertThrows(IllegalStateException.class,
        ()->accounts.ensureGoogleAccount("worker@example.com","Worker","worker-sub"));
    assertEquals(false,accounts.get(username).get("enabled"));
  }

  @Test void explicitPasswordConfirmedLinkPreservesUsernamePasswordTierAndHistory(){
    accounts.upsert("fieldtech","Field Tech","fieldtech@example.com","correct-pass-123",true,"TIER_3");
    assertThrows(IllegalArgumentException.class,
        ()->accounts.requirePasswordForGoogleLink("fieldtech","wrong-pass"));
    assertDoesNotThrow(()->accounts.requirePasswordForGoogleLink("fieldtech","correct-pass-123"));
    assertThrows(IllegalStateException.class,
        ()->accounts.linkGoogleAccount("fieldtech","other@example.com","subject-123"));
    assertEquals("fieldtech",accounts.linkGoogleAccount("fieldtech","fieldtech@example.com","subject-123"));
    assertEquals("PASSWORD_GOOGLE",accounts.get("fieldtech").get("authProvider"));
    assertEquals("TIER_3",accounts.tier("fieldtech"));
    assertEquals("fieldtech",accounts.ensureGoogleAccount("fieldtech@example.com","Field Tech","subject-123"));
    assertEquals("fieldtech",accounts.loadUserByUsername("fieldtech").getUsername());
    assertTrue(new BCryptPasswordEncoder().matches("correct-pass-123",
        db.queryForObject("select password_hash from client_account where username='fieldtech'",String.class)));
  }

  @Test void GoogleIdentityCannotBeReusedAcrossTwoAccounts(){
    accounts.upsert("account1","One","one@example.com","password1-123",true,"TIER_1");
    accounts.upsert("account2","Two","two@example.com","password2-123",true,"TIER_1");
    assertEquals("account1",accounts.linkGoogleAccount("account1","one@example.com","same-sub"));
    assertThrows(IllegalStateException.class,
        ()->accounts.linkGoogleAccount("account2","two@example.com","same-sub"));
  }

  @Test void GoogleOnlyAccountsDoNotAcceptPasswordLinkOrChange(){
    String google=accounts.ensureGoogleAccount("only@example.com","Only","subject-456");
    assertThrows(IllegalArgumentException.class,
        ()->accounts.requirePasswordForGoogleLink(google,"password123"));
    assertThrows(IllegalArgumentException.class,
        ()->accounts.changePassword(google,"password123","different-password123"));
  }

  @Test void missingGoogleIdentityIsRejected(){
    assertThrows(IllegalArgumentException.class,
        ()->accounts.ensureGoogleAccount("someone@example.com","Name"," "));
    assertThrows(IllegalArgumentException.class,
        ()->accounts.ensureGoogleAccount("not-an-email","Name","sub-987"));
  }
}
