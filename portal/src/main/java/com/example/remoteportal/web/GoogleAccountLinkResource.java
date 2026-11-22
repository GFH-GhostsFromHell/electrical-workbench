package com.example.remoteportal.web;

import com.example.remoteportal.service.ClientAccountStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.time.Instant;
import java.util.Map;

/**
 * Google linking is explicit and requires the logged-in password user to enter
 * their current password again. It never links accounts by email alone.
 */
@RestController
public class GoogleAccountLinkResource {
  private final ClientAccountStore accounts;
  private final ClientRegistrationRepository registrations;

  public GoogleAccountLinkResource(ClientAccountStore accounts, ClientRegistrationRepository registrations) {
    this.accounts=accounts;
    this.registrations=registrations;
  }

  public record LinkRequest(String currentPassword) {}

  @PostMapping("/api/profile/google/link/start")
  public Map<String,String> start(Principal principal,
      @RequestHeader(value="X-Requested-With",required=false) String requestedWith,
      @RequestBody LinkRequest request,
      HttpServletRequest servletRequest) {
    if (!"XMLHttpRequest".equals(requestedWith))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Use the authenticated profile form to link Google.");
    if (registrations.findByRegistrationId("google")==null)
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Google sign-in is not configured on this server.");
    if (principal==null)
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sign in with your password first.");
    try {
      accounts.requirePasswordForGoogleLink(principal.getName(), request.currentPassword());
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,e.getMessage());
    }

    HttpSession session=servletRequest.getSession(true);
    session.setAttribute("googleLinkAccount",principal.getName());
    session.setAttribute("googleLinkIssuedAt",Instant.now().getEpochSecond());
    return Map.of("url","/oauth2/authorization/google");
  }
}
