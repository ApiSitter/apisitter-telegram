var statusCodeChangeDC=429;
var timeoutDEfault=20000;
var timeoutRetryDefault=2500;
var timeoutRetrySocketDefault=1500;
var maxRetryApiDefault=3;
var maxRetrySocketDefault=3;
var initUrl="chat.apisitter.io";

function ApiSitter() {
    this.dc=initUrl;

    this.setClientTelegramAuthParameters = function(idClientTelegram, tokenClientTelegram){
        this.idClientTelegram = idClientTelegram.toString();
        this.tokenClientTelegram = tokenClientTelegram.toString();
    }

    this.sendCodeForCreateClient = function(apiSitterEmail, apiSitterToken, phone, dialCode, callback){
        try{
            if(!apiSitterEmail || !apiSitterToken){
                //return error = 0 - input error
                return callback("GENERIC_ERROR_API", null, "apiSitterEmail or apiSitterToken not in input");
            }
            var url = "https://"+this.dc+"/apiTelegram/sendCode/" + phone + "/" + dialCode;
            var data = null;
            var xhr = new XMLHttpRequest();
            var refer = this;
            xhr.timeout = 20000; // time in milliseconds
            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                    if(this.status == 0) {
                        // Generic error send process;
                        return callback("GENERIC_ERROR_API", null, null);
                    }else if(this.status != 200) {
                        // Error in API (request code != 200);
                        if(this.status==429){
                            try{
                                data = JSON.parse(this.responseText);
                                refer.dc=data.dc;
                                return refer.sendCodeForCreateClient(apiSitterEmail,apiSitterToken,phone,dialCode,callback);
                            }catch(e){
                                return callback("GENERIC_ERROR_API", null, e.toString());
                            }
                        }else return callback(null, this.status, this.responseText);
                    }else{
                        var data = null;
                        try{
                            data = JSON.parse(this.responseText);
                            refer.idClientTelegram = data.id;
                            refer.tokenClientTelegram = data.token;
                        }catch(e){
                            data = this.responseText;
                        }
                        return callback(null, this.status, data);
                    }
                }
            });
            xhr.ontimeout = function (e) {
                // XMLHttpRequest timed out. Do something here.
                return callback("GENERIC_ERROR_API", null, e.toString());
            };
            xhr.open("GET", url);
            xhr.setRequestHeader("content-type", "application/json");
            xhr.setRequestHeader("authorization", "Basic " + btoa(apiSitterEmail + ":" + apiSitterToken));
            xhr.setRequestHeader("cache-control", "no-cache");
            xhr.send(data);


        }catch(e){
            callback("GENERIC_ERROR_IN_METHOD", null, null);
        }
    }

    this.callApi = function(requestType, apiName, parameter, callback, options){
        try{
            var url = "https://"+this.dc+"/apiTelegram/" + apiName;
            if(!apiName.includes("account.updateStatus"))this.autoClose=false;
            if(requestType == "POST"){
                if(typeof parameter != 'string') parameter = JSON.stringify(parameter);
            }else{
                parameter = null;
            }
            if(options==null)options=new Object();
            if(!options.hasOwnProperty("timestampStartApi"))options.timestampStartApi=Date.now();
            if(!options.hasOwnProperty("timeout"))options.timeout=timeoutDEfault;
            if(!options.hasOwnProperty("maxRetryApi"))options.maxRetryApi=maxRetryApiDefault;
            if(options.hasOwnProperty("retryCount"))options.retryCount=options.retryCount+1;else options.retryCount=0;
            if(!options.hasOwnProperty("timeoutRetry"))options.timeoutRetry=timeoutRetryDefault;
            if(options.retryCount>options.maxRetryApi)return callback("MAX_API_RETRY_OCCURED", null, null);
            var refer = this;
            var xhr = new XMLHttpRequest();
            xhr.timeout = options.timeout; // time in milliseconds
            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                    if(this.status == 0) {
                        // Generic error send process;
                        refer.dc=initUrl;
                        setTimeout(function() {
                            refer.callApi(requestType, apiName, parameter, callback, options);
                        }.bind(this),getRandomArbitrary(options.timeoutRetry,options.timeoutRetry+500));
                    }else if(this.status != 200) {
                        if(this.status==429){
                            try{
                                console.log(this.responseText);
                                data = JSON.parse(this.responseText);
                                refer.dc=data.dc;
                                return refer.callApi(requestType, apiName, parameter, callback, options);
                            }catch(e){
                                console.log(e);
                                return callback("GENERIC_ERROR_API", null, e.toString());
                            }
                        }else return callback(null, this.status, this.responseText);
                    }else{
                        var data = null;
                        try{
                            data = JSON.parse(this.responseText);
                        }catch(e){
                            data = this.responseText;
                        }
                        return callback(null, this.status, data);
                    }
                }
            });
            xhr.ontimeout = function(data) {
                refer.dc=initUrl;
                setTimeout(function() {
                    refer.callApi(requestType, apiName, parameter, callback, options);
                }.bind(this),getRandomArbitrary(options.timeoutRetry,options.timeoutRetry+500));
            }
            xhr.open(requestType, url);
            xhr.setRequestHeader("content-type", "application/json");
            xhr.setRequestHeader("authorization", "Basic " + btoa(this.idClientTelegram + ":" + this.tokenClientTelegram));
            xhr.setRequestHeader("cache-control", "no-cache");

            xhr.send(parameter);
        }catch(e){
            callback("GENERIC_ERROR_IN_METHOD", null, null);
        }
    }


    this.initUpdatesListener = function(callback,options){
        this.startUpdatesListenerFlag=false;
        this.autoCloseUpdatesListener=false;
        if(this.timeoutUpdatesListener)clearTimeout(this.timeoutUpdatesListener);
        this.callbackUpdatesListener=callback;
        if(options)this.optionsUpdatesListener=options;
        else this.optionsUpdatesListener=new Object();
        this.lastTimestampUpdatesListener=(new Date()).getTime();
        this.flagIsInApi=false;
    }

    this.getUpdates = function (callback,options) {
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
    }

    this.startUpdatesListener =function () {
        this.startUpdatesListenerFlag=true;
        this.callbackUpdatesListener(null,200,null);
        if(this.flagIsInApi==false)this.getUpdates(this.callbackUpdatesListener,this.optionsUpdatesListener);
    }

    this.stopUpdatesListener = function () {
        this.startUpdatesListenerFlag=false;
    }

    // fa una callApi e ha parametro callback(error, result, body);
    this.closeClientTelegram = function(callback){
        try{
            this.callApi("GET", "closeClient", null, function(error, result, body){
                callback(error, result, body);
            });
        }catch(e){
            return callback("GENERIC_ERROR_IN_METHOD", null, null);
        }
    }

    this.getIdClientTelegram = function(){
        return this.idClientTelegram;
    }

    this.getTokenClientTelegram = function(){
        return this.tokenClientTelegram;
    }

    //bytes: array di bytes del file
    // progress: callback di progresso con parametri (fileId, partsCompleted, numberOfParts)
    // callback: funzione di ritorno con campi error, data = {id:fileId, parts: numberOfParts}
    // options (è opzionale): oggetto con
    // {
    //  timeout: 15000,
    //  sizeFilePart: 131072,
    //  parallelUploadParts: 5,
    //  maxRetry: 3 --> [0..3] numero tentativi per ogni saveFilePart
    // }
    this.uploadFile = async function(bytes, progress, callback, options){
        let upload = new UploadFile(this.idClientTelegram, this.tokenClientTelegram);
        upload.uploadFile(bytes, progress, callback, options);
    }

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
    this.downloadFile = async function(location, dc_id, size, progress, callback, options) {
        let download = new DownloadFile(this.idClientTelegram, this.tokenClientTelegram);
        download.downloadFile(location, dc_id, size, progress, callback, options);
    }
}
function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
function DownloadFile(idCLientTelegram, tokenClientTelegram){
    this.idCLientTelegram = idCLientTelegram;
    this.tokenClientTelegram = tokenClientTelegram;

    this.downloadFile = async function(location, dc_id, size, progress, callback, options) {
        try{
            this.dc_id = dc_id;
            var option=new Object();
            option.timeout = 15000;
            option.sizeFilePart = 131072 / 16;
            option.parallelDownloadParts = 5;
            option.maxRetry = 3;
            option.type = "";//per uso interno
            option.dc_id = dc_id;
            if(options){
                for(var i in options) {
                    if(option.hasOwnProperty(i)){
                        option[i] = options[i];
                    }
                }
            }
            if(!size){
                size = 10000000; // 10 MB
            }
            this.numberOfParts = Math.ceil(size / option.sizeFilePart);

            this.partsCompleted = 0;
            var numInstantCallSequenze = Math.ceil(this.numberOfParts / option.parallelDownloadParts);

            let finished = false;
            let body;
            let bytes = new Array();
            for(let i=0; i<numInstantCallSequenze; i++){
                let date = new Date().getTime();
                var calls = new Array();
                var inError = false;
                for(let j=i*5; j<this.numberOfParts && j<((i+1)*5); j++){
                    let paramters = {
                        "offset": j * option.sizeFilePart,
                        "limit": option.sizeFilePart,
                        "location": location
                    }
                    calls.push(this.downloadPart(paramters, (j * option.sizeFilePart), option.timeout, 0, option.maxRetry, progress));
                }
                let aus;
                await Promise.all(calls).then(
                    values => {
                    aus = values;
                for(let i=0; i<values.length; i++){
                    if(values[i].bytes.data.length <=0){
                        finished = true;
                    }else{
                        for(let j=0; j<values[i].bytes.data.length; j++){
                            bytes.push(values[i].bytes.data[j]);
                        }
                        body = values[i];
                        body.bytes.data = bytes;
                    }
                }
            }).catch (reason => {
                    inError = true;
            });
                if(inError){
                    return callback("GENERIC_ERROR_IN_METHOD")
                }
                if(finished == true){
                    return callback(null, null, body);
                }
                body = aus[aus.length - 1];
            }
            body.bytes.data = bytes
            return callback(null, null, body);
        }catch(e){
            return callback("GENERIC_ERROR_IN_METHOD", null, null);
        }
    }

    this.downloadPart = function(paramters, startIndex, timeout, tryNum, maxRetry, progress){
        var refer = this;
        return new Promise(function (resolve, reject) {
            var url = "https://chat.apisitter.io/apiTelegram/upload.getFile/" + this.dc_id;
            let data = JSON.stringify(paramters);
            var xhr = new XMLHttpRequest();
            xhr.addEventListener("readystatechange", function(){
                if (this.readyState === 4) {
                    if(this.status == 0) {
                        if(tryNum < maxRetry){
                            tryNum++;
                            resolve(refer.downloadPart(paramters, startIndex, timeout, tryNum, maxRetry, progress));
                        }else{
                            reject("Error");
                        }
                    }else if(this.status == 200) {
                        var data = null;
                        try{
                            data = JSON.parse(this.responseText);
                        }catch(e){
                            data = this.responseText;
                        }
                        refer.partsCompleted++;
                        progress(refer.partsCompleted, refer.numberOfParts);
                        resolve(data);
                    }else{
                        if(tryNum < maxRetry){
                            tryNum++;
                            refer.dc_id = refer.getDC(this.responseText);
                            resolve(refer.downloadPart(paramters, startIndex, timeout, tryNum, maxRetry, progress));
                        }else{
                            reject("Error");
                        }
                    }
                }
            });
            xhr.open("POST", url);
            xhr.setRequestHeader("content-type", "application/json");
            xhr.setRequestHeader("authorization", "Basic " + btoa(this.idCLientTelegram + ":" + this.tokenClientTelegram));
            xhr.setRequestHeader("cache-control", "no-cache");
            xhr.timeout = timeout;
            xhr.send(data);
        }.bind(this));
    }

    this.getDC = function(message){
        var string="MIGRATE_";
        if(message.search(string)!=-1){
            var dc = parseInt(message.substring(message.search(string) + string.length, message.length));
            return dc;
        }
        else
            return 4;
    }
}

function UploadFile(idCLientTelegram, tokenClientTelegram) {
    this.idCLientTelegram = idCLientTelegram;
    this.tokenClientTelegram = tokenClientTelegram;

    this.uploadFile = async function(bytes, progress, callback, options){
        try{
            if(bytes.length > 10000000){
                return callback("FILE_TOO_BIG");
            }
            var sizeFilePart = 131072;
            var parallelUploadParts = 5;
            var maxRetry = 3;
            var timeout = 15000;

            if(options && options.sizeFilePart) sizeFilePart = options.sizeFilePart;
            if(options && options.parallelUploadParts) parallelUploadParts = options.parallelUploadParts;
            if(options && options.maxRetry) maxRetry = options.maxRetry;

            this.numberOfParts = Math.ceil(bytes.length / sizeFilePart);

            this.partsCompleted = 0;
            var numInstantCallSequenze = Math.ceil(this.numberOfParts / parallelUploadParts);
            let fileId = Math.floor((Math.random() * new Date().getTime()) + 1);

            for(let i=0; i<numInstantCallSequenze; i++){
                let date = new Date().getTime();
                var calls = new Array();
                var inError = false;
                for(let j=i*5; j<this.numberOfParts && j<((i+1)*5); j++){
                    let partialBytes = bytes.slice((j*sizeFilePart), ((j+1)*sizeFilePart));
                    calls.push(this.uploadPart(fileId, j, partialBytes, timeout, 0, maxRetry, progress));
                }
                await Promise.all(calls).then(
                    values => {
                }).catch (reason => {
                    inError = true;
            });
                if(inError){
                    return callback("GENERIC_ERROR_IN_METHOD")
                }
            }
            return callback(null, {id: fileId, parts: this.numberOfParts});
        }catch(e){
            return callback("GENERIC_ERROR_IN_METHOD", null);
        }
    }

    this.uploadPart = function(fileId, partNum, bytes, timeout, tryNum, maxRetry, progress){
        var refer = this;
        return new Promise(function (resolve, reject) {
            var url = "https://chat.apisitter.io/apiTelegram/upload.saveFilePart";
            var data = {
                file_id: fileId,
                file_part: partNum,
                bytes: bytes
            };
            data = JSON.stringify(data);
            var xhr = new XMLHttpRequest();
            xhr.addEventListener("readystatechange", function(){
                if (this.readyState === 4) {
                    if(this.status == 0) {
                        if(tryNum < maxRetry){
                            tryNum++;
                            resolve(refer.uploadPart(fileId, partNum, bytes, timeout, tryNum, maxRetry, progress));
                        }else{
                            reject("Error");
                        }
                    }else if(this.status == 200) {
                        var data = null;
                        try{
                            data = JSON.parse(this.responseText);
                        }catch(e){
                            data = this.responseText;
                        }
                        refer.partsCompleted++;
                        progress(fileId, refer.partsCompleted, refer.numberOfParts);
                        resolve(data);
                    }else{
                        if(tryNum < maxRetry){
                            tryNum++;
                            resolve(refer.uploadPart(fileId, partNum, bytes, timeout, tryNum, maxRetry, progress));
                        }else{
                            reject("Error");
                        }
                    }
                }
            });
            xhr.ontimeout = function(data) {
                if(tryNum < maxRetry){
                    tryNum++;
                    resolve(refer.uploadPart(fileId, partNum, bytes, timeout, tryNum, maxRetry, progress));
                }else{
                    reject("Timeout Error");
                }
            }
            xhr.open("POST", url);
            xhr.setRequestHeader("content-type", "application/json");
            xhr.setRequestHeader("authorization", "Basic " + btoa(this.idCLientTelegram + ":" + this.tokenClientTelegram));
            xhr.setRequestHeader("cache-control", "no-cache");
            xhr.timeout = timeout;
            xhr.send(data);
        }.bind(this));
    }
}



