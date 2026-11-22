package com.example.remoteportal.web;

import com.example.remoteportal.service.ClientAccountStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GoogleAccountLinkResourceTest {
  private final ClientAccountStore accounts=mock(ClientAccountStore.class);
  private final ClientRegistrationRepository registration=mock(ClientRegistrationRepository.class);
  private final HttpServletRequest request=mock(HttpServletRequest.class);
  private final HttpSession session=mock(HttpSession.class);
  private final GoogleAccountLinkResource resource=new GoogleAccountLinkResource(accounts,registration);

  @Test void passwordReauthenticationIsRequiredAndLinkIsBoundToSession() {
    when(registration.findByRegistrationId("google")).thenReturn(mock(ClientRegistration.class));
    when(request.getSession(true)).thenReturn(session);
    var result=resource.start(()->"fieldtech","XMLHttpRequest",
        new GoogleAccountLinkResource.LinkRequest("current-pass"),request);
    assertEquals("/oauth2/authorization/google",result.get("url"));
    verify(accounts).requirePasswordForGoogleLink("fieldtech","current-pass");
    verify(session).setAttribute("googleLinkAccount","fieldtech");
    verify(session).setAttribute(eq("googleLinkIssuedAt"),anyLong());
  }

  @Test void noBrowserProofHeaderMeansDeniedBeforeCheckingCredentials() {
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,
        ()->resource.start(()->"fieldtech",null,
            new GoogleAccountLinkResource.LinkRequest("pass"),request)).getStatusCode());
    verifyNoInteractions(accounts);
  }

  @Test void unconfiguredGoogleCannotStartLinking() {
    assertEquals(HttpStatus.SERVICE_UNAVAILABLE,assertThrows(ResponseStatusException.class,
        ()->resource.start(()->"fieldtech","XMLHttpRequest",
            new GoogleAccountLinkResource.LinkRequest("pass"),request)).getStatusCode());
    verifyNoInteractions(accounts);
  }

  @Test void incorrectPasswordNeverCreatesLinkRequest() {
    when(registration.findByRegistrationId("google")).thenReturn(mock(ClientRegistration.class));
    doThrow(new IllegalArgumentException("The current password is incorrect."))
        .when(accounts).requirePasswordForGoogleLink("fieldtech","wrong");
    assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
        ()->resource.start(()->"fieldtech","XMLHttpRequest",
            new GoogleAccountLinkResource.LinkRequest("wrong"),request)).getStatusCode());
    verifyNoInteractions(session);
  }
}
