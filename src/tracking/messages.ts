export function sendTracking<T>(message:unknown,timeout=3000):Promise<T>{return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Tracking request timed out')),timeout);
  Promise.resolve().then(()=>chrome.runtime.sendMessage(message)).then(response=>{clearTimeout(timer);if(!response?.ok)reject(Error('Tracking unavailable'));else resolve(response);},error=>{clearTimeout(timer);reject(error);});
});}
