'use strict';
var request = require('request');
var async=require('async');
var statusCodeChangeDC=429;
var timeoutDEfault=20000;
var timeoutRetryDefault=2500;
var timeoutRetrySocketDefault=1500;
var maxRetryApiDefault=3;
var maxRetrySocketDefault=3;
var initUrl="chat.apisitter.io";

function debug(printable){

    this.printable=printable;

    this.print=function(string){

        if(this.printable===true){
            var now = new Date().toUTCString();
            console.log(now+"-"+new Date().getTime()+" ---- "+string);
            if(typeof string === 'object'){
                console.log(string);
            } //JSON.stringify dà errore se la struttura è circular...NON LO USO...
        }
    }

    this.printError=function (string,err){
        var now = new Date().toUTCString();
        console.log("---------------------------------------------------------------------------");
        console.log("ERROR "+now);
        console.log(string);
        if(err)console.log(err);//JSON.stringify dà errore se la struttura è circular...NON LO USO...
        return;
    }

}

var Debug=new debug(false);

function ClientTelegram(idClientTelegram, tokenClientTelegram) {
    Debug.print("sono in ClientTelegram");

    if (!(this instanceof ClientTelegram)) {
        Debug.print("creo nuovo client...");
        return new ClientTelegram(idClientTelegram,tokenClientTelegram);
    }else{
        Debug.print("client già presente...");
    }

    if(idClientTelegram)this.idClientTelegram = idClientTelegram.toString();
    if(tokenClientTelegram)this.tokenClientTelegram=tokenClientTelegram.toString();

    this.dc=initUrl;

}

function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}


ClientTelegram.prototype={

    setClientTelegramAuthParameters:function(idClientTelegram, tokenClientTelegram){
        this.idClientTelegram = idClientTelegram.toString();
        this.tokenClientTelegram = tokenClientTelegram.toString();
    },

    sendCodeForCreateClient:function(apiSitterEmail,apiSitterToken,phone,dialCode,callback){
        //in più devo salvare idClientTelegram e tokenClientTelegram con this.setClientTelegramAuth(idClientTelegram, tokenClientTelegram); uso idClientTelegram e tokenClientTelegram che mi ritorna la sendCode
        try{
            if (!(this instanceof ClientTelegram)) {
                return callback("Initialize client!");
            }
            if(!apiSitterEmail || !apiSitterToken){
                //return error = 0 - input error
                Debug.print("apiSitterEmail or apiSitterToken not in input");
                return callback("GENERIC_ERROR_IN_METHOD", null, "apiSitterEmail or apiSitterToken not in input");
            }

            var url = "https://"+this.dc+"/apiTelegram/sendCode/" + phone + "/" + dialCode;
            var data = null;
            var timoutTemp=20000;
            var object = {
                method: "GET",
                uri: url,
                auth: {
                    'user': apiSitterEmail,
                    'pass': apiSitterToken,
                    'sendImmediately': true
                },
                json: true,
                timeout:timoutTemp,
                body: null
            };
            //Debug.print(object);
            request(object,function(err, result, body) {
                if(err){
                    Debug.print(err);
                    return callback("GENERIC_ERROR_API", null, err);
                }

                if(result.statusCode==429){
                    this.dc=body.dc;
                    Debug.print("cambio DC to"+this.dc);
                    return this.sendCodeForCreateClient(apiSitterEmail,apiSitterToken,phone,dialCode,callback);
                }

                if(result.statusCode==200){
                    this.idClientTelegram = "" + body.id;
                    this.tokenClientTelegram = body.token;
                }

                Debug.print(this.idClientTelegram);
                Debug.print(this.tokenClientTelegram);
                Debug.print(body);
                return callback(err, result.statusCode, body);
            }.bind(this));
        }catch (err){
            Debug.print(err);
            callback("GENERIC_ERROR_IN_METHOD", null, err);
        }
    },



    getIdClientTelegram:function(){
        return this.idClientTelegram;
    },

    getTokenClientTelegram:function(){
        return this.tokenClientTelegram;
    },

    //option è un oggetto opzionale con i seguenti campi:
    //1) timeout: millisendi di timeout per l'api, di default è 20000
    //2) maxRetryApi: integer che rappresenta il numero di volte che posso eseguire un'api
    //3) timeoutRetry: millisecondi di ritardo nel tentativo di rifare un tentativo di api
    callApi :function (requestType, apiName, parameter, callback, options) {
        try{
            if (!(this instanceof ClientTelegram)) {
                return callback("Initialize client!");
            }
            if(!apiName.includes("account.updateStatus"))this.autoClose=false;
            Debug.print("callMetod " + apiName);
            Debug.print(this.idClientTelegram + " " + this.tokenClientTelegram);
            if(options==null)options=new Object();
            if(!options.hasOwnProperty("timestampStartApi"))options.timestampStartApi=Date.now();
            if(!options.hasOwnProperty("timeout"))options.timeout=timeoutDEfault;
            if(!options.hasOwnProperty("maxRetryApi"))options.maxRetryApi=maxRetryApiDefault;
            if(options.hasOwnProperty("retryCount"))options.retryCount=options.retryCount+1;else options.retryCount=0;
            if(!options.hasOwnProperty("timeoutRetry"))options.timeoutRetry=timeoutRetryDefault;
            if(options.retryCount>options.maxRetryApi)return callback("MAX_API_RETRY_OCCURED", null, null);
            var object= {
                method: requestType,
                uri: "https://"+this.dc+"/apiTelegram/"+apiName,
                auth: {
                    'user': this.idClientTelegram,
                    'pass': this.tokenClientTelegram,
                    'sendImmediately': true
                },
                json: true,
                timeout:options.timeout,
                body: parameter,
                rejectUnauthorized: false
            };

            Debug.print(object);
            request(object,function(err, result, body) {
                if(err){
                    Debug.print("callApi() errore " + err);
                    Debug.print(err);
                    this.dc=initUrl;
                    setTimeout(function() {
                        this.callApi(requestType, apiName, parameter, callback, options);
                    }.bind(this),getRandomArbitrary(options.timeoutRetry,options.timeoutRetry+500));
                    return;
                }
                if(result.statusCode==429){
                    Debug.print("finito chiamata API "+apiName);
                    Debug.print(body);
                    this.dc=body.dc;
                    Debug.print("cambio DC to"+this.dc);
                    return this.callApi(requestType, apiName, parameter, callback, options);
                }
                Debug.print("finito chiamata API "+apiName);
                var timestampApi=(Date.now()) - options.timestampStartApi;
                return callback(err, result.statusCode, body , timestampApi);
            }.bind(this));
        }catch (err){
            Debug.print(err);
            callback("GENERIC_ERROR_IN_METHOD", null, err);
        }

    },

    //Parametri::
    //1)callback(err,result,body) --> come callAPi

    // data è l'oggetto che mi ritorna il socket
    //2) options è un oggetto con i seguenti campi:
    // - timeoutGetUpdates: millisecondi di ricardo tra una chiamata e l'altra, minimo 1500 ms
    initUpdatesListener : function (callback,options){
        this.startUpdatesListenerFlag=false;
        this.autoCloseUpdatesListener=false;
        if(this.timeoutUpdatesListener)clearTimeout(this.timeoutUpdatesListener);
        this.callbackUpdatesListener=callback;
        if(options)this.optionsUpdatesListener=options;
        else this.optionsUpdatesListener=new Object();
        this.lastTimestampUpdatesListener=(new Date()).getTime();
        this.flagIsInApi=false;
    },

    getUpdates : function (callback,options) {
        if(this.timeoutUpdatesListener)clearTimeout(this.timeoutUpdatesListener);
        this.flagIsInApi=false;

        if(this.startUpdatesListenerFlag==false)return;


        var timestampNow=(new Date()).getTime();
        if(this.autoCloseUpdatesListener==true && (timestampNow< this.lastTimestampUpdatesListener+60000))return;

        this.flagIsInApi=true;
        this.callApi("GET","getUpdates",{},function(err,result,body) {

            this.lastTimestampUpdatesListener=(new Date()).getTime();
            var time;
            if(err){
                time=getRandomArbitrary(5000,10000);
            }
            else{
                if(result){
                    if(result==456)this.autoCloseUpdatesListener=true;
                    else this.autoCloseUpdatesListener=false;

                    var min;
                    if(options.hasOwnProperty("timeoutGetUpdates"))min=options.timeoutGetUpdates;
                    else min=1500;
                    if(min<1500)min=1500;
                    if(result!=200)min=10000;
                    time=getRandomArbitrary(min,min+1200);
                }
            }
            if(callback)callback(err,result,body);
            this.timeoutUpdatesListener=setTimeout(function() {
                this.getUpdates(callback,options);
            }.bind(this),time);

        }.bind(this),{timeout:45000});
    },

    startUpdatesListener :function () {
        this.startUpdatesListenerFlag=true;
        this.callbackUpdatesListener(null,200,null);
        if(this.flagIsInApi==false)this.getUpdates(this.callbackUpdatesListener,this.optionsUpdatesListener);
    },

    stopUpdatesListener :function () {
        this.startUpdatesListenerFlag=false;
    },

    //Parametri:
    //1) callback(err, result, body) -> come callAPi
    closeClientTelegram :function (callback) {
        var url="https://"+this.urlApi+"/closeClient";
        var object={
            // will be ignored
            method: "GET",
            uri: url,
            auth:{
                'user': this.idClientTelegram,
                'pass': this.tokenClientTelegram,
                'sendImmediately': true
            },
            json:true,
            body:{},
            timeout:15000
        };
        request(object,function(err, result, body) {
                Debug.print("finito chiamata API stop client");
                if(callback)return callback(err, result, body);
            }.bind(this)
        );
    },


    //PARAMETRI:
    // 1) bytes : array di byte
    // 2) progress: è una callback : progress(fileId,uploadedPart,parts)
    // 3) callback : callback(err,data) -> se err=null ho data che è un oggetto {id:file_id,parts:number_part}
    // 4) options : è un oggetto di configurazione con i seguenti campi tutti opzionali:
    // - timeout : millisecondi di durata di ogni singola api di upload , default: 15000
    // - sizeFilePart : defaul 131072 , numero di byte per ogni singola api
    // - parallelUploadParts : default 5 , numero di chiamate in parallelo
    // - maxRetry: default 3 , numero di tentativi per ogni upload
    uploadFile: function(bytes,progress,callback,options) {
        try{
            if(bytes.length>10000000){return callback("FILE_TOO_BIG");}
            var option=new Object();
            option.timeout=15000;
            option.sizeFilePart=131072;
            option.parallelUploadParts=3;
            option.maxRetry=5;
            if(options){
                for(var i in options) {
                    if(option.hasOwnProperty(i))option[i]=options[i];
                }
            }

            var file_id=Date.now();
            var numByte=option.sizeFilePart; //512000;//12288;//4096;
            var number_part= Math.ceil((bytes.length)/numByte);
            var arrayObject=new Array();
            var inizio=0;
            var fine= inizio+numByte;
            for(var i=0;i<number_part;i++){
                var objInvio=new Object();
                objInvio.file_id=file_id;
                objInvio.file_part=i;
                objInvio.result=false;//for internal use
                var arrayBuffer = new Array();
                for(var z=inizio; z<fine && z<bytes.length; z++){
                    arrayBuffer.push(bytes[z]);
                }
                inizio=fine;
                fine=inizio+numByte;
                objInvio.bytes=arrayBuffer;//.toString();
                arrayObject.push(objInvio);
            }

            this.uploadArray({id:file_id,parts:number_part},0,arrayObject,progress,callback,option)
        }catch(err){
            callback("GENERIC_ERROR_IN_METHOD",null,err);
        }
        return;
    },

    uploadArray: function(ritorno,retry,arrayObject,progress,callback,option){
        //console.log("inizio tentativo"+retry);

        async.eachLimit(arrayObject, option.parallelUploadParts, function(item, callbackSeries) {

            Debug.print("Sono in async.eachLimit...");
            if(arrayObject[item.file_part].result)return callbackSeries();
            var newOption=new Object();
            newOption.timeout=option.timeout;
            newOption.maxRetryApi=option.maxRetry;
            newOption.retryCount=0;
            newOption.timeoutRetry=250;
            this.callApi("POST","upload.saveFilePart",item,function (err,result,body) {
                arrayObject[item.file_part].result=false;
                if(err){
                    callbackSeries();
                    Debug.print("err"+err);
                    return ;
                }

                if(result==200){
                    if(body==true || body=="true")arrayObject[item.file_part].result=true;
                    var count=0;
                    for(var i=0; i<arrayObject.length;i++){
                        if(arrayObject[i].result==true)count++;
                    }
                    progress(ritorno.id,count,ritorno.parts);
                }else{
                    Debug.print(result+"-"+body);
                }
                callbackSeries();

            },newOption);

        }.bind(this), function(err,result) {
            for(var i=0; i<arrayObject.length;i++){
                if(arrayObject[i].result==false){
                    if(retry<option.maxRetry) return this.uploadArray(ritorno,retry+1,arrayObject,progress,callback,option);
                    else return callback("GENERIC_ERROR_API");
                }
            }
            return callback(null,ritorno);
        }.bind(this));

    },

    //PARAMETRI:
    // 1) parameter  : oggetto con i seguenti campi:
    // - location : oggetto di tipo location come richiesto da upload.getFile
    // - dc_id
    // - size , può essere opzionale , se null default è 10000000
    // 2) progress: è una callback : progress(downloadedPart,parts) solo se size è != null
    // 3) callback : callback(err,data) -> se err=null ho data che è come risposta di upload.getFile
    // 4) options : è un oggetto di configurazione con i seguenti campi tutti opzionali:
    // - timeout : millisecondi di durata di ogni singola api di upload , default: 15000
    // - sizeFilePart : defaul 131072 , numero di byte per ogni singola api
    // - parallelDownloadParts : default 5 , numero di chiamate in parallelo
    // - maxRetry: default 3 , numero di tentativi per ogni upload
    downloadFile: function(location,dc_id,size,progress,callback,options) {
        try{
            if(size==null)size=10000000;//di default metto 10 mbye
            var option=new Object();
            option.timeout=15000;
            option.sizeFilePart=131072;
            option.parallelDownloadParts=5;
            option.maxRetry=3;
            option.type="";//per uso interno
            option.dc_id=dc_id;
            if(options){
                for(var i in options) {
                    if(option.hasOwnProperty(i))option[i]=options[i];
                }
            }

            var arrayObject=new Array();
            var index=0;
            for(var offset=0;offset<size;offset=offset+option.sizeFilePart){
                var objInvio=new Object();
                objInvio.location=location;
                objInvio.offset=offset;
                objInvio.limit=option.sizeFilePart;
                objInvio.result=false;//for internal use
                objInvio.index=index; index++;
                arrayObject.push(objInvio);
            }
            //Debug.print(arrayObject);

            this.downloaArray(0,arrayObject,progress,callback,option)
        }catch(err){
            Debug.print(err);
            callback("GENERIC_ERROR_IN_METHOD",null,err);
        }
        return;
    },

    downloaArray: function(retry,arrayObject,progress,callback,option){
        Debug.print("inizio tentativo"+retry);

        async.eachLimit(arrayObject, option.parallelDownloadParts, function(item, callbackSeries) {

            if(arrayObject[item.index].result!=false){
                Debug.print("nn chiamo più il pezzo"+item.index);
                return callbackSeries();
            }

            var newOption=new Object();
            newOption.timeout=option.timeout;
            newOption.maxRetryApi=option.maxRetry;
            newOption.retryCount=0;
            newOption.timeoutRetry=250;

            this.callApi("POST","upload.getFile/"+option.dc_id,{location:item.location,offset:item.offset,limit:item.limit},function (err,result,body) {
                arrayObject[item.index].result=false;
                if(err){
                    callbackSeries();
                    Debug.print("err"+err);
                    return ;
                }

                if(result==200){
                    Debug.print("finita ok indice"+item.index);
                    arrayObject[item.index].result=body;
                    if(option.type==""){
                        option.type=body.type._typeName;
                    }else if(body.type._typeName!="storage.fileUnknown" && body.type._typeName!="storage.filePartial"){
                        option.type=body.type._typeName;
                    }
                    var count=0;
                    for(var i=0; i<arrayObject.length;i++){
                        if(arrayObject[i].result!=false)count++;
                    }
                    progress(count,arrayObject.length);
                    if(body.bytes.data.length==0){
                        //non mando errore ma setto come fatte tutte le chiamate successive...
                        // in questo modo son tranquillo che faccio solo quelle necessarie,
                        // se mandavo errore a volte poteva capitare di ottenere che chiamate necessarie non venivano eseguite..
                        Debug.print("Ho lunghezza zero quindi ho finito il download");
                        for(var i=item.index;i<arrayObject.length;i++){
                            arrayObject[i].result=body;
                        }
                    }
                }else if(result==303){
                    Debug.print(result+"-"+body);
                    option.dc_id=getDC(body);
                    return callbackSeries(1);
                }else{
                    Debug.print(result+"-"+body);
                }
                callbackSeries();

            }.bind(this),newOption);

        }.bind(this), function(err,result) {
            if(err){
                if(err==1) return this.downloaArray(retry+1,arrayObject,progress,callback,option);
            }else{
                //ho finito e verifico se tutti i pezzi siano stati downlodati correttamente
                var byte=new Array();
                for(var i=0; i<arrayObject.length;i++){
                    if(arrayObject[i].result==false){
                        if(retry<option.maxRetry) return this.downloaArray(retry+1,arrayObject,progress,callback,option);
                        else return callback("GENERIC_ERROR_API");
                    }
                    for(var z=0;z<arrayObject[i].result.bytes.data.length;z++){
                        byte.push(arrayObject[i].result.bytes.data[z]);//salvo un vettore di byte totali..
                    }
                }
            }
            //se son qui è perchè ho finito tutto correttamente
            //ritorno il primo membro così ho la struttura corretta la cambio i byte e anche il tipo
            arrayObject[0].result.bytes.data=Buffer.from(byte);
            arrayObject[0].result.type._typeName=option.type;
            return callback(null,arrayObject[0].result);
        }.bind(this));

    }





}

function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function getDC(message){
    var string="MIGRATE_";
    Debug.print("sono in getDC");
    Debug.print(message.search(string));
    if(message.search(string)!=-1){
        Debug.print("ho errore "+string);
        var dc = parseInt(message.substring(message.search(string) + string.length, message.length));
        Debug.print("nuovo dc trovato:"+dc);
        return dc;
    }
    else
        return 4;
}


module.exports = ClientTelegram;
module.exports.ApiSitter = ClientTelegram;
