- [x] ~~Possibilita di uploadare DXF (forse anche DWG) per il background del floor plan, convertendoli in file SVG o PNG.~~

- [x] ~~I marker per le stanze e le postazioni sono troppo grandi quando zoommi dentro: bisogna scalare la mappa senza far scalare i marker.~~

- [x] ~~Possibilita di importare JSON per riutilizzare floor plan gia creati in passato. Il JSON deve essere validato e, in caso di JSON non valido o corrotto, va mostrato un pop-up di errore senza importare nulla.~~

- [x] ~~Implementazione del tasto "Add meeting rooms" per aggiungere stanze riunioni (dovrebbe funzionare come il tasto "Add rooms" ma nelle meeting rooms non puoi aggiungere postazioni).~~

- [x] ~~Lo station marker deve anche avere accanto al suo nome il nome della stanza a cui e associato.~~

- [x] ~~Fare in modo che i marker possano essere aggiunti e mossi solo nei confini dell'immagine.~~

- [x] ~~Creare un pop-up di conferma quando clicchi sul tasto Clear. Il pop-up deve avere "conferma" e "annulla": con conferma si cancella tutto, con annulla non viene cancellato nulla.~~

- [x] ~~Fix del bug per cui, dopo aver cliccato Clear, una nuova immagine caricata non veniva renderizzata.~~

- [ ] Implementazione di hotkeys per utilizzare l'editor in modo piu veloce. (per ora ignorare)

- [x] ~~Aggiornare la creazione del JSON (renderlo migliore).~~

- [x] ~~Ottimizzare (quando muovi la mappa lagga).~~

- [x] ~~Quando zoomi la risoluzione dei marker diminuisce e man mano che zoomi diventano molti più "pixellati".~~

- [x] ~~Quando muovi la mappa i marker non si muovono finchè non rilasci.~~ 

- [x] ~~la mappa è molto pixellata quando zoomi, è un problema del file o del codice?~~

- [x] ~~Quando clicchi sul tasto "+" per aggiungere una postazione (station) ad una stanza, bisogna fare in modo che puoi continuare ad aggiungere postazioni senza dover ri-cliccare sul "+" (ovviamente se clicchi sul tasto "+" di un'altra stanza o su "add room" etc allora cambia. Dovresti potere uscire dalla modalità di aggiungere stations anche quando premi esc sulla tastiera, come quando clicchi sul tasto "add rooms").~~

- [ ] Ottimizzare (lag durante lo zoom con la rotellina del mouse). (semi-implementazione ma il lag mentre zoomi persiste, forse per ora non ottimizzabile?)

- [x] ~~aggiornare uid. (fare in modo che sia sempre unico).~~

- [x] ~~Quando si fa la validazione del JSON durante l'importo bisogna controllare se il nome dell'immagine e le dimensioni sono le stesse, se si, allora procedi come se nulla fosse, ma se no, allora crea un pop-up che avverte lo user che l'immagine non è la stessa e che quindi ci potrebbero essere problemi, con un bottone di conferma e uno di cancellazione (quello di cancellazione non fara importare il JSON mentre quello di conferma continuerà la validazione).~~