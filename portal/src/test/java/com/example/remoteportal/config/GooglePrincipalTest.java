package com.example.remoteportal.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GooglePrincipalTest {
  @Test void googleOAuthClientEnablesOnlyWithBothCredentialsAndUsesCorrectCallback() {
    SecurityConfig config=new SecurityConfig();
    assertNull(config.clientRegistrationRepository("","").findByRegistrationId("google"));
    assertNull(config.clientRegistrationRepository("some-id","").findByRegistrationId("google"));
    var google=config.clientRegistrationRepository("web-client-id","web-client-secret").findByRegistrationId("google");
    assertNotNull(google);
    assertEquals("google",google.getRegistrationId());
    assertTrue(google.getScopes().contains("openid"));
    assertTrue(google.getScopes().contains("email"));
    assertEquals("{baseUrl}/login/oauth2/code/{registrationId}",google.getRedirectUri());
  }

  @Test void localUsernameIsUsedByPortalWhileGoogleSubjectRemainsVerifiable() {
    Instant issued=Instant.now();
    OidcIdToken token=new OidcIdToken("dummy-id-token",issued,issued.plusSeconds(3600),
        Map.of("sub","google-stable-subject","email","fieldtech@example.com","email_verified",true));
    SecurityConfig.LocalOidcUser principal=new SecurityConfig.LocalOidcUser(
        List.of(new SimpleGrantedAuthority("ROLE_CLIENT")),token,"fieldtech");
    assertEquals("fieldtech",principal.getName());
    assertEquals("google-stable-subject",principal.getSubject());
    assertEquals("fieldtech@example.com",principal.getEmail());
    assertEquals(true,principal.getEmailVerified());
    assertTrue(principal.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_CLIENT")));
  }
}
