let readMoreCont = {};
let buttonsCount = 0;
let input;
let context;
let globalMessageCount = 0;
let messageCounter = 0;
// let orientation = (screen.orientation || {}).type || screen.mozOrientation || screen.msOrientation;
let orientation = window.screen.orientation;
function start() {
    document.getElementById('sender').onkeypress = function (e) {
        if (!e) e = window.event;
        let keyCode = e.keyCode || e.which;
        if (keyCode === 13) {
            sendMessageByElement(document.getElementById("sender"));
            return false;
        }
    };

    window.onhashchange = () => {
        let hash = window.location.hash.replace("#", "");
        if (hash.substr(0, 5) !== "chat_") sendMessage(decodeURIComponent(hash));
    };

    sendRequest();
    input = document.getElementById("sender");
}

function sendMessageByElement(elem) {
    if(elem.value !== ""){
    sendMessage(elem.value);
    elem.value = "";
    }
}

function sendRequest(msg = "") {
    if (input) input.disabled = true;
    fetch("/conversation",
        {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify(context ? {text: msg, context: context} : {text: msg})
        })
        .then((res) => {
            res.json().then((data) => {
                    // console.log(data);
                    input.disabled = false;
                    context = data.body.session_id;
                    if (data.body.response_type === "text") {
                        messageCounter++;
                        for (let message of data.body.messages){
                            sendMessage(message, true);
                        }

                        // Antes ele concatenava as mensagens e isso fazia com que ficasse tudo em um só balão
                        // for (let message of data.body.messages)
                        //     fullMSG += "" + message;
                        // sendMessage(fullMSG, true);
                    } else if (data.body.response_type === "option") {
                        let services = data.body.services;
                        let first = true;
                        if (length(services) > 3) {
                            for (let key in services) {
                                let service = services[key];
                                let options = makeOptionsJson(service);
                                if (!options) return;
                                options.service = key;
                                options.options.push({value: "Link", text: options.link.value});
                                options.link = null;
                                options.instruction = null;
                                sendMessage("", true, options, first);
                                first = false;
                            }
                        } else for (let key in services) {
                            let service = services[key];
                            let options = makeOptionsJson(service);
                            if (options) options.service = key;
                            sendMessage("", true, options, first);
                            first = false;
                        }
                    }
                    if (globalMessageCount === 0) {
                        messageCounter++;
                        sendMessage(window.location.hash.replace("#", ""));
                    }
                    document.getElementById("sender").focus();
                }
            );
        })
        .catch((res) => {
            alert("Ocorreu um erro...");
            alert("Vamos recarregar a pagina...");
            console.log(res);
            window.location = window.location;
        });
}

function readMore(elem, className) {
    let description = document.getElementsByClassName(className)[parseInt(elem.getAttribute("num"))];
    elem.classList.add("unshow");
    description.innerHTML = description.getAttribute("extended");
}

function makeOptionsJson(service) {
    let options = {description: service.description};
    options.options = [];

    try {
        for (let option of service.options) {
            if (option.value === "Link") {
                if (!option.text) {
                    options["link"] = {};
                    options["link"].value = "http://fortaleza.ce.gov.br";
                    options["link"].short = "http://fortaleza.ce.gov.br";
                } else {
                    options["link"] = {};
                    if (option.text.length > 30)
                        options["link"].short = option.text.substr(0, 30) + "...";
                    else
                        options["link"].short = option.text;
                    options["link"].value = option.text;
                }
                options.instruction = "Para esse serviço eu também posso lhe ajudar com: ";
            } else if (option.text !== "") options.options.push(option);
        }
    } catch (e) {
        return null;
    }

    if (!options["link"]) {
        options["link"] = {};
        options["link"].value = "http://fortaleza.ce.gov.br";
        options["link"].short = "http://fortaleza.ce.gov.br";
    }

    return options;
}

function sendMessage(msg, bluelab = false, options = false, scroll = true) {
    globalMessageCount++;
    let chatContainer = document.getElementById("chatScroll");
    let messageContainer = document.createElement("DIV");
    let message = document.createElement("P");
    message.innerHTML = msg;
    if (msg && bluelab) {

        msg = processMessageText(msg);
        if (msg.shortComplete) {
            message.setAttribute("extended", msg.complete);
            message.innerHTML = msg.short;
        } else message.innerHTML = msg.complete;
    }

    if (bluelab) {

        if ((!msg || msg === "false") && !options) return;
        waitingChange(false);

        if(messageCounter === 1) {
            let img = document.createElement("IMG");
            img.classList.add("image-message-bot");
            img.setAttribute("src", "./assets/img/drchat%20rounded.png");
            messageContainer.appendChild(img);
            messageCounter = 0;
        }else{
            let space = document.createElement("div");
            space.classList.add("space-message-bot");
            messageContainer.appendChild(space);
        }

        messageContainer.classList.add("chat-message-container-bluelab");
        if (typeof (msg) === "object" && !options && msg.length > 1) {
            message.innerHTML = "";
            for (let theMessage of msg) {
                message.innerHTML += theMessage + "<br>";
            }

            message.classList.add("chat-message-bluelab");
            // let span = document.createElement("SPAN");
            // span.classList.add("chat-message-arrow");
            // let span2 = document.createElement("SPAN");
            // span2.classList.add("chat-message-arrow-2");
            // messageContainer.appendChild(span);
            // messageContainer.appendChild(span2);

            messageContainer.appendChild(message);
            chatContainer.appendChild(messageContainer);

            return;
        }

        if (options) {

            let containerOut = document.createElement("DIV");
            containerOut.classList.add("chat-message-container-bluelab-buttons");

            let containerIn1 = document.createElement("DIV");
            containerIn1.classList.add("chat-message-container-bluelab-first");

            let instruction = document.createElement("P");

            if (options.instruction) {
                instruction.classList.add("chat-message-bluelab");
                instruction.innerHTML = options.instruction;
            }

            let containerIn2 = document.createElement("DIV");
            containerIn2.classList.add("chat-buttons");

            containerOut.appendChild(containerIn1);
            if (options.instruction && options.options.length) containerOut.appendChild(instruction);
            containerOut.appendChild(containerIn2);

            let description = document.createElement("P");
            description.classList.add("chat-message-custom-description");

            let service = options.service ? `<strong>${options.service}</strong><br>` : null;

            if (options.description) {
                if (options.description.length > 300) {
                    description.innerHTML = service + options.description.substr(0, 260) + "...";
                    description.setAttribute("extended", service + options.description);

                    containerIn1.appendChild(description);
                    containerIn1.appendChild(document.createElement("BR"));
                    containerIn1.appendChild(readMoreButton("chat-message-custom-description"));
                } else {
                    let desc = "";
                    if (options.service) desc += service;
                    if (options.description) desc += options.description;
                    description.innerHTML = desc;
                    containerIn1.appendChild(description);
                    readMoreButton("chat-message-custom-description", false);
                }
            } else {
                let desc = "";
                if (options.service) desc += service;
                if (options.description) desc += options.description;
                description.innerHTML = desc;
                containerIn1.appendChild(description);
                readMoreButton("chat-message-custom-description", false);
            }

            let link = document.createElement("P");
            if (options.link) {
                link.classList.add("chat-message-custom-link");
                link.innerHTML = `Link: <a target='_blank' href="${options.link.value}">${options.link.short}</a>`;
                containerIn1.appendChild(link);
            }

            for (let option of options.options) {
                let newOptionButton = document.createElement("BUTTON");
                newOptionButton.innerHTML = option.value;
                newOptionButton.classList.add("chat-button");
                newOptionButton.setAttribute("onclick", "sendMessage(this.value, true); disableButton(this);");
                newOptionButton.setAttribute("num", buttonsCount.toString());
                if (option.value === "Link") newOptionButton.value = `<strong>${options.service}</strong><br><a target='_blank' href="${option.text}">${option.text}</a>`;
                else newOptionButton.value = option.text;
                containerIn2.appendChild(newOptionButton);
            }

            buttonsCount++;

            messageContainer.appendChild(containerOut);
            chatContainer.appendChild(messageContainer);
            scrollTo(messageContainer, scroll);
            return;

        } else {
            message.classList.add("chat-message-bluelab");
        }
    } else {
        waitingChange(true);
        sendRequest(msg);
        messageContainer.classList.add("chat-message-container-user");
        message.classList.add("chat-message-user");
    }


    messageContainer.appendChild(message);

    // let span = document.createElement("SPAN");
    // span.classList.add("chat-message-arrow");
    // let span2 = document.createElement("SPAN");
    // span2.classList.add("chat-message-arrow-2");
    // messageContainer.appendChild(span);
    // messageContainer.appendChild(span2);

    if (msg) if (msg.shortComplete) {
        message.classList.add("chat-message-bluelab-readmore");
        message.appendChild(document.createElement("BR"));
        message.appendChild(readMoreButton("chat-message-bluelab-readmore"));
    }

    chatContainer.appendChild(messageContainer);
    scrollTo(messageContainer, scroll);

}

function readMoreButton(className, readButton = true) {
    if (!readMoreCont[className]) readMoreCont[className] = 0;
    let readMore = document.createElement("BUTTON");
    readMore.innerHTML = "Saiba mais";
    readMore.setAttribute("onclick", `readMore(this, '${className}')`);
    readMore.classList.add("chat-more-button");
    readMore.setAttribute("num", readMoreCont[className]);

    readMoreCont[className]++;
    if(readButton) return readMore;
    else return null;
}

function scrollTo(element, realScroll = true) {
    element.id = `chat_${globalMessageCount}`;
    do {
        if (realScroll) window.location.hash = `chat_${globalMessageCount}`;
    } while (!document.getElementById(element.id)) if (realScroll) window.location.hash = `chat_${globalMessageCount}`;
    // console.log(document.getElementById("chatScroll").scrollTop-scroll);
}

function processMessageText(msg, maxSize = 400) {
    let message = {complete: "", short: ""};
    let noButtons = true;
    msg = msg.toString();
    for (let j = 0; j < msg.length; j++) {
        if (msg.charCodeAt(j) === 8226) {
            noButtons = false;
            for (let x = j, stop = false; !stop; x++) {
                if (msg.charCodeAt(x) === 216) {
                    let aTag = "<a href=\"#" + msg.substring(j + 2, x) + "\" class='chat-message-bluelab-tbutton'>" + msg.substring(j + 1, x).replace("• ", "") + "</a><br>";
                    message.complete += aTag;
                    if (j < maxSize) message.short += aTag;
                    else if (!message.shortComplete)
                        message.shortComplete = true;

                    j = x + 1;
                    stop = true;
                }
            }
        } else {
            if (!message.shortComplete) message.short += msg[j];
            message.complete += msg[j];
        }
    }
    if (noButtons) {
        if (msg.length > maxSize) {
            message.short = msg.substring(0, maxSize) + "...";
            message.shortComplete = true;
        }
        message.complete = msg;
    }

    return message;
}

function disableButtons(elem) {
    let id = parseInt(elem.getAttribute("num"));
    let buttons = document.getElementsByClassName("chat-buttons")[id].children;
    for (let button of buttons)
        button.disabled = true;
}

function disableButton(elem) {
    elem.disabled = true;
}

function length(element) {
    let size = 0;
    for (let el in element)
        size++;
    return size;
}

function waitingChange(status) {
    if (status) document.getElementById("chatStatus").innerText = "Digitando...";
    else {
        // if (orientation.type === "portrait-secondary" || orientation.type === "portrait-primary") {
        //     document.getElementById("screenDirection").style.display = "none";
        // }else if (orientation.type === "landscape-primary") {
        //     document.getElementById("screenDirection").style.display = "flex";
        // }
        document.getElementById("chatStatus").innerText = "Assistente Virtual";
    }
}

function openInfo(){
    document.getElementById("infoModal").style.display = "flex";
}

function closeInfo(){
    document.getElementById("infoModal").style.display = "none";
}
