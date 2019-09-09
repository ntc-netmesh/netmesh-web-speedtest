///////////////////////////////////////////////////////////////////////////////
// Directives
///////////////////////////////////////////////////////////////////////////////
"use strict";

///////////////////////////////////////////////////////////////////////////////
// Label control
///////////////////////////////////////////////////////////////////////////////
class Label {
    constructor(param) {
		this.isready = false;
		this.redraw = true;
		this.update = false;
		this.visible = true;
		this.type = 'label';
		
		let canvas = document.createElement('canvas');
		canvas.id = escape(param.id);
		this.id = param.id;
		this.context = canvas.getContext('2d');
		this.rect = param.rect;
        this.origin = new Vector2d(this.rect.x, this.rect.y);
        this._label = param.label? param.label : '';
        this.newtext = param.text? param.text : '';
        this.color = param.colors? param.colors : ['white', 'white'];
        this.offset = param.offset? param.offset : 0;
        this.fheight = param.height? param.height : 25;
        // internal
        this._text = '';

		this.context.canvas.setAttribute('width',this.rect.w);
		this.context.canvas.setAttribute('height',this.rect.h);
		this.isready = true;		
		Dashboard.gui.set(this.id, this);
    }
    get text () { return this._text; }
    set text (val) {
        this.newtext = val;
    }
    get label () { return this._label;}
    set label (val) {
        this._label = val;
        this.redraw = true;
    }
    show (param) {
        this.visible = param;
        this.redraw = true;
    }
    reset (param) {
        this.newtext = '';
    }
    Update(elapsed) {
        if (this._text != this.newtext) {
            this._text = this.newtext;
            this.redraw = true;
        }
        return this.update;
    }
    Draw() {
        if (!this.isready) return false;
        if (!this.redraw) return false;		
        
        this.context.clearRect(0,0,this.context.canvas.width,this.context.canvas.height);
		if (this.visible) {
            //label
            this.context.fillStyle = this.color[0];
			this.context.font = `${this.fheight-5}px M1m`;
			this.context.textAlign = "left";
            this.context.fillText(this.label, 0, this.rect.h/2);
            //text
            this.context.fillStyle = this.color[1];
			this.context.font = `${this.fheight}px M1m`;
			this.context.textAlign = "left";
			this.context.fillText(this._text, 40+this.offset, this.rect.h/2);
        }
		this.redraw = false;
		this.update = true;
		return true;
    }
}

///////////////////////////////////////////////////////////////////////////////
// Button control
///////////////////////////////////////////////////////////////////////////////
const BUTTON_BASE = 0;
const BUTTON_HOVER = 1;
const BUTTON_CLICK = 2;

class Button {
    constructor(param) {
		this.isready = false;
		this.redraw = true;
		this.update = false;
		this.visible = true;
		this.type = 'button';
		
		let canvas = document.createElement('canvas');
		canvas.id = escape(param.id);
		this.id = param.id;
		this.context = canvas.getContext('2d');
		this.rect = param.rect;
        this.origin = new Vector2d(this.rect.x, this.rect.y);
        this.center = new Vector2d(this.rect.w/2, this.rect.h/2);
        this.radius = this.rect.w/2;
        this.label = param.label? param.label : [this.id];
        this.color = param.colors? param.colors : ['white', 'white', 'white'];
        this.onClick = null;
        this.tcolor = param.textcolors? param.textcolors : ['white', 'white', 'white'];
        this.tooltip = param.tooltip? param.tooltip : null;
        // internal
        this._state = BUTTON_BASE;
        this.prevstate = BUTTON_BASE;
        this.labelnum = 0;
        this.action = param.onClick? param.onClick : null;

		this.context.canvas.setAttribute('width',this.rect.w);
		this.context.canvas.setAttribute('height',this.rect.h);
		this.isready = true;		
		Dashboard.gui.set(this.id, this);
    }
    get state () { return this._state; }
    set state (val) {
        this._state = val;
        if (val == BUTTON_CLICK) {
            if (this.label[1])
                this.labelnum = (this.labelnum+1)%2;
            if (this.onClick)
                (this.onClick)();
        }
    }
    set enable (val) {
        if (val===true)
            this.onClick = this.action;
        else
            this.onClick = null;
        this.redraw = true;
    }
    show (param) {
        this.visible = param;
        this.redraw = true;
    }
    reset () {
        this.labelnum = 0;
        this._state = BUTTON_BASE;
        this.prevstate = BUTTON_BASE;
        this.onClick = this.action;
        this.redraw = true;
    }
    isPointInButton(point) {
        let absolute_center = new Vector2d(this.center.vx+this.rect.x, this.center.vy+this.rect.y);
        return (absolute_center.distance(point) < this.radius);
    }
    showTooltip (obj) {
		obj.context.save();
		obj.context.fillStyle = '#FFFFE0';
		obj.context.shadowColor = 'black';
		obj.context.shadowBlur = 2;

		obj.context.font = '14px sans-serif';
		let w = obj.context.measureText(this.tooltip).width;
		let h = 14;
		let x = Math.min(obj.coord.vx, obj.canvas.width - w - 5);
		let y = Math.max(obj.coord.vy, 2*h + 5);
		obj.context.fillRect(x-5, y-5-h-10, w+10, h+10);
		//obj.context.strokeRect(x-5, y-5+h, w+10, h+10);
		
		obj.context.shadowBlur = 0;
		obj.context.fillStyle = 'black';
		obj.context.textBaseline = 'top';
		obj.context.fillText(this.tooltip, x, y - h -10);
		obj.context.restore();
    }
    Update(elapsed) {
        if (this._state != this.prevstate) {
            this.prevstate = this._state;
            this.redraw = true;

            if ((this._state == BUTTON_HOVER)  && this.tooltip)
                Dashboard.transTime = 1.0;
        }
        return this.update;
    }
    Draw() {
        if (!this.isready) return false;
        if (!this.redraw) return false;		
        
        this.context.clearRect(0,0,this.context.canvas.width,this.context.canvas.height);
		if (this.visible) {
            // background
			this.context.save();
            this.context.beginPath();
			this.context.fillStyle = this.color[this._state];
			this.context.arc(this.center.vx, this.center.vy, this.radius-1, 0, 2*Math.PI);
			this.context.fill();
   			// outer ring
			this.context.beginPath();
			this.context.strokeStyle = this.tcolor[0];
			this.context.lineWidth = 3;
			this.context.arc(this.center.vx, this.center.vy, this.radius-2, 0, 2*Math.PI);
            this.context.stroke();
			// label
            this.context.fillStyle = this.tcolor[this._state];
            let fontheight = this.radius/2;
			this.context.font = `${fontheight}px M1m`;
			this.context.textAlign = "center";
			this.context.fillText(this.label[this.labelnum], this.center.vx, this.center.vy+fontheight/3);
            
			this.context.restore();

        }
		this.redraw = false;
		this.update = true;
		return true;
    }
}