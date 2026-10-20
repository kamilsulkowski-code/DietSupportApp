/* Progressive enhancement: the existing app also works without service workers or installation APIs. */
(() => {
  const byId=id=>document.getElementById(id);
  const install=byId('pwaInstall'),update=byId('pwaUpdate'),status=byId('pwaStatus');
  const notice=byId('offlineNotice'),help=byId('pwaInstallHelp');
  const updateNotice=byId('pwaUpdateNotice'),updateMessage=byId('pwaUpdateMessage'),updateNow=byId('pwaUpdateNow');
  let deferredInstall=null,registration=null,reloadRequested=false;
  let hadController=!!navigator.serviceWorker?.controller,activeUpdate=false;
  const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
  const busy=()=>typeof settingsDirty!=='undefined'&&settingsDirty||typeof generatingPlan!=='undefined'&&generatingPlan||typeof authBusy!=='undefined'&&authBusy||typeof passwordFormDirty==='function'&&passwordFormDirty();
  function showStatus(text){status.textContent=text}
  function canReload(){if(busy()){const message='Najpierw zapisz lub odrzuć szkic i zaczekaj na zakończenie bieżącej operacji.';showStatus(message);updateNotice.hidden=false;updateMessage.textContent=message;return false}return true}
  function networkState(){
    const offline=navigator.onLine===false;
    notice.hidden=!offline;
    notice.textContent='Tryb offline. Dane chmurowe, logowanie i generator AI wymagają internetu. Po ponownym otwarciu bez sieci pokazujemy tylko interfejs, ustawienia lokalne i plan przykładowy, nie zapisany plan AI. Zmiany lokalne nie są automatycznie synchronizowane.';
    if(typeof renderAccount==='function')renderAccount();
    if(offline)showStatus('Brak połączenia. Dostępny jest interfejs offline po wcześniejszej wizycie online.');
    else if(standalone())showStatus('Forma działa w trybie aplikacji.');
  }
  function offerUpdate(){update.hidden=false;update.textContent='Aktualizuj aplikację';updateNotice.hidden=false;updateMessage.textContent='Dostępna jest nowa wersja. Aktualizacja nastąpi dopiero po Twoim kliknięciu.';showStatus(updateMessage.textContent);}
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;install.textContent='Zainstaluj Formę';install.hidden=standalone()});
  window.addEventListener('appinstalled',()=>{deferredInstall=null;install.hidden=true;help.hidden=true;showStatus('Aplikacja została zainstalowana.');});
  install.addEventListener('click',async()=>{
    if(!deferredInstall){help.hidden=!help.hidden;return}
    const prompt=deferredInstall;deferredInstall=null;install.disabled=true;
    try{await prompt.prompt();const choice=await prompt.userChoice;showStatus(choice.outcome==='accepted'?'Zaakceptowano instalację.':'Instalację anulowano. Możesz wrócić do niej później.');}
    catch{help.hidden=false;showStatus('Skorzystaj z instrukcji instalacji w swojej przeglądarce.');}
    finally{install.disabled=false;install.textContent='Jak zainstalować';install.hidden=standalone()}
  });
  function updateApp(){
    if(!canReload())return;
    if(registration?.waiting){reloadRequested=true;registration.waiting.postMessage({type:'SKIP_WAITING'});}
    else if(activeUpdate)location.reload();
  }
  update.addEventListener('click',updateApp);
  updateNow.addEventListener('click',updateApp);
  window.addEventListener('online',()=>{networkState();showStatus('Połączenie przywrócone. Zmiany lokalne nie są automatycznie wysyłane do chmury. W razie potrzeby odśwież aplikację i sprawdź status synchronizacji.');registration?.update().catch(()=>{});});
  window.addEventListener('offline',networkState);
  install.hidden=standalone();networkState();
  if(!('serviceWorker' in navigator)||!window.isSecureContext){showStatus('Instalacja i tryb offline wymagają zgodnej przeglądarki oraz HTTPS.');return}
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloadRequested){reloadRequested=false;location.reload();return}
    if(hadController){activeUpdate=true;update.hidden=false;update.textContent='Odśwież do nowej wersji';updateNow.textContent=update.textContent;updateNotice.hidden=false;updateMessage.textContent='Nowa wersja jest gotowa. Ta karta nie została automatycznie przeładowana.';showStatus(updateMessage.textContent);}
    hadController=true;
  });
  const base=new URL('./',document.baseURI);
  navigator.serviceWorker.register(new URL('sw.js',base).href,{scope:base.href,updateViaCache:'none'}).then(reg=>{
    registration=reg;
    if(reg.waiting)offerUpdate();
    function watchWorker(worker){
      if(!worker)return;
      const changed=()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller)offerUpdate();
        if(worker.state==='redundant')showStatus('Nie udało się przygotować nowej wersji offline. Bieżąca wersja pozostaje dostępna.');
      };
      worker.addEventListener('statechange',changed);changed();
    }
    reg.addEventListener('updatefound',()=>watchWorker(reg.installing));
    watchWorker(reg.installing);
    navigator.serviceWorker.ready.then(()=>{if(!reg.waiting&&navigator.onLine!==false)showStatus(standalone()?'Forma działa w trybie aplikacji.':'Interfejs jest przygotowany do otwarcia bez sieci. Dane chmurowe i AI nadal wymagają internetu.');});
    reg.update().catch(()=>{});
  }).catch(()=>showStatus('Nie udało się przygotować trybu offline. Aplikacja nadal działa online; spróbuj po odświeżeniu.'));
})();
