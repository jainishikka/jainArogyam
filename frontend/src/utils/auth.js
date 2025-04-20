
/** Call this on successful LLogin submit */
export function setLoggedIn() {
    localStorage.setItem('isLoggedIn', 'true');
  }
  
  /** Call this on logout, if you ever add one */
  export function clearLoggedIn() {
    localStorage.removeItem('isLoggedIn');
  }
  
  /** Check from any component / guard */
  export function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
  }
  