///////////////////////////////////////////////////////////////////////////////
// Directives
///////////////////////////////////////////////////////////////////////////////
"use strict";

///////////////////////////////////////////////////////////////////////////////
// HTML Forms
///////////////////////////////////////////////////////////////////////////////
const SELECT_NAME = 'serverList';
const INPUT_NAME = 'filter';
const BUTTON_NAME = 'Server';
class ServerForm {
    constructor(param) {
        this.newForm = document.createElement('form');
        this.close = param.onClose;

        this.newForm.id = param.id;
        let newHeading = document.createElement('h1');
        newHeading.innerHTML = param.id;
        this.newForm.appendChild(newHeading);
        let newHr = document.createElement('hr');
        this.newForm.appendChild(newHr);

        this.parent = Dashboard.canvas.parentElement;
        this.parent.appendChild(this.newForm);
        let x = Dashboard.canvas.offsetLeft + (Dashboard.canvas.clientWidth-this.newForm.clientWidth)/2;
        let y = Dashboard.canvas.offsetTop + (Dashboard.canvas.clientHeight-this.newForm.clientHeight)/2;
        this.newForm.setAttribute('style', 'position:absolute; left:'+x+'px; top:'+y+'px');
        
        // add filter textbox
        this.addInput(INPUT_NAME, 'Search/Filter servers', param.filter);
    
        // add selectbox
        this.serverList = param.list;
        this.addSelect(SELECT_NAME, this.serverList, param.callback);

        // add close button
        this.addClose('Close');
    }
    get selectedServer () {
        let ctrl = document.getElementById(SELECT_NAME);
		return ctrl.options[ctrl.selectedIndex].value;
    }
    get filterString () {
        let ctrlInput = document.getElementById(INPUT_NAME);
        return ctrlInput.value;
    }
    addInput(id, text, callback) {
        let element = document.createElement("input");
        element.name = id;
        element.id = id;
        //if (param.type) element.type = param.type;
        element.placeholder = text;
        element.onkeyup = callback;
        this.newForm.appendChild(element);
    }
    addSelect(id, list, callback) {
        let element = document.createElement("select");
        element.name = id;
        element.id = id;      
        element.size = 8;
        let opts = [];
        for (let l of list) {
            opts.push(l.nickname);
        }
        this.updateOptions(opts, element);
        element.onchange = callback;
        this.newForm.appendChild(element);
    }
    updateOptions(opts, element=null) {
        if (!element)
            element = document.getElementById(SELECT_NAME);
        const options = opts.map(opt => {
            return `<option value="${opt}">${opt}</option>`;
        });
        element.innerHTML = options;
    }
    addClose(id) {
        let element = document.createElement("input");
        element.type = "button";
        element.name = id;
        element.id = id;
        element.value = 'X';
        //element.appendChild(document.createTextNode(name));
        this.newForm.appendChild(element);
        Helper.addEvent(element, 'click', ((e) => {
                if (e.which != 1) return;
                (this.close)();
            }), false);    
    }
}

const ABOUT_NAME = 'about';
class AboutBox {
    constructor(param) {
        this.newForm = document.createElement('form');
        this.close = param.onClose;

        this.newForm.id = param.id;
        let newHeading = document.createElement('h1');
        newHeading.innerHTML = param.id;
        this.newForm.appendChild(newHeading);
        let newHr = document.createElement('hr');
        this.newForm.appendChild(newHr);

        this.parent = Dashboard.canvas.parentElement;
        this.parent.appendChild(this.newForm);
        let x = Dashboard.canvas.offsetLeft + (Dashboard.canvas.clientWidth-this.newForm.clientWidth)/2;
        let y = Dashboard.canvas.offsetTop + (Dashboard.canvas.clientHeight-this.newForm.clientHeight)/2;
        this.newForm.setAttribute('style', 'position:absolute; left:'+x+'px; top:'+y+'px');
        
        // add readonly text area
        this.addTextarea(ABOUT_NAME, param.message);
        // add close button
        this.addClose('Close');
    }
    addTextarea(id, msg) {
        let element = document.createElement("textarea");
        element.name = id;
        element.id = id;
        element.readOnly = true;
        element.value = msg;
        this.newForm.appendChild(element);
    }
    addClose(id) {
        let element = document.createElement("input");
        element.type = "button";
        element.name = id;
        element.id = id;
        element.value = 'X';
        //element.appendChild(document.createTextNode(name));
        this.newForm.appendChild(element);
        Helper.addEvent(element, 'click', ((e) => {
                if (e.which != 1) return;
                (this.close)();
            }), false);    
    }
}
