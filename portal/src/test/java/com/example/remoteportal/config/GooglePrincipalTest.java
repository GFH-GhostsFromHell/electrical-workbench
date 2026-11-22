package com.example.remoteportal.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GooglePrincipalTest {
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
