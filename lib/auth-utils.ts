export function loginEmail(identity:string){
 const value=identity.trim().toLowerCase();
 return value==='naappe'?'naappe@gmail.com':value.includes('@')?value:`${value}@users.voteoperations.app`;
}
export function authErrorMessage(error:unknown){
 const message=error instanceof Error?error.message:typeof error==='object'&&error!==null&&'message' in error?String(error.message):'Unable to sign in. Please try again.';
 if(/fetch|network|load failed|timeout/i.test(message))return 'Cannot reach the sign-in server. Check your connection and try again. If needed, try another network.';
 if(/too many requests|rate limit|over_request_rate_limit/i.test(message))return 'Too many sign-in attempts. Wait a few minutes before trying again.';
 if(/email not confirmed/i.test(message))return 'Confirm your email address before signing in.';
 if(/jwt expired|refresh token not found|invalid refresh token/i.test(message))return 'Your session has expired. Sign in again.';
 if(/invalid login credentials/i.test(message))return 'The email or password is incorrect. Use naappe@gmail.com for your administrator account.';
 return message;
}
