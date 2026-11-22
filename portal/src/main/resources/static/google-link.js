/* Explicit Google linking for authenticated password-account owners.
 * No Google access token or app password is saved in local storage. */
(function(root){
'use strict';
root.loadGoogleLinkSettings=async function(profile){
  const wrapper=document.getElementById('googleProfile');
  if(!wrapper||!profile||profile.subscriptionTier==='ADMIN')return;
  try{
    const response=await fetch('/api/public/auth-options',{credentials:'same-origin'});
    if(!response.ok)return;
    const options=await response.json();
    if(!options.google)return;
    wrapper.style.display='block';
    const provider=String(profile.authProvider||'PASSWORD').toUpperCase();
    const form=document.getElementById('googleLinkForm');
    const info=document.getElementById('googleProfileInfo');
    const passwordFields=document.getElementById('passwordLoginFields');
    if(passwordFields)passwordFields.style.display=provider==='GOOGLE'?'none':'block';
    if(provider==='GOOGLE'||provider==='PASSWORD_GOOGLE'){
      form.style.display='none';
      info.textContent=provider==='GOOGLE'
       ?'Connected: You sign in using Google. Use your Google account settings to manage authentication.'
       :'Connected: Both Google and your current Electrical Workbench password can sign in to this account.';
      return;
    }
    form.style.display='block';
    info.textContent='Already registered with your username and password? Confirm your current password, then choose a Google account with the same verified email as your profile. Your username, subscription and saved work stay unchanged.';
  }catch(error){
    const label=document.getElementById('googleLinkStatus');
    if(label)label.textContent='Google configuration could not be checked right now.';
  }
};
root.connectGoogleAccount=async function(){
 const status=document.getElementById('googleLinkStatus');
 const secret=document.getElementById('googleLinkPassword');
 const button=document.getElementById('googleLinkButton');
 if(!status||!secret||!button)return;
 if(!secret.value){status.textContent='Enter your current Electrical Workbench password to connect Google.';return;}
 button.disabled=true;
 status.textContent='Verifying your password…';
 try {
   const res=await fetch('/api/profile/google/link/start',{
     method:'POST',credentials:'same-origin',
     headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'},
     body:JSON.stringify({currentPassword:secret.value})
   });
   secret.value='';
   const json=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(json.message||json.detail||'Unable to connect Google. Confirm your password and profile email.');
   if(json.url!=='/oauth2/authorization/google')throw Error('The server returned an unexpected authorization link.');
   // Direct navigation retains the same server-side session that started linking.
   root.location.assign(json.url);
 }catch(error){
   status.textContent=error.message||'Unable to start Google linking.';
   button.disabled=false;
 }
};
})(window);
