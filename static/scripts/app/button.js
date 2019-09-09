///////////////////////////////////////////////////////////////////////////////
// Directives
///////////////////////////////////////////////////////////////////////////////
"use strict";

///////////////////////////////////////////////////////////////////////////////
// Local Helpers
///////////////////////////////////////////////////////////////////////////////
require(["app/main"], function() {
	Helper.getControl = ((id) => {
        return Dashboard.gui.get(id);
    });
    Helper.getControlById = ((id) => {
        return Dashboard.gui.get(id);
    })
    Helper.getControlByType = ((type) => {
        let ctrlArray = new Array();
        for (let [key, control] of Dashboard.gui) {
            if (control.type == type)
                ctrlArray.push(key);
        }
        return ctrlArray;
    });
    Helper.getControlByGroup = ((group) => {
        let ctrlArray = new Array();
        for (let [key, control] of Dashboard.gui) {
            if (control.group == group)
                ctrlArray.push(key);
        }
        return ctrlArray;
    })
});

///////////////////////////////////////////////////////////////////////////////
// Selectable/clickable image; base class for buttons, imagemaps, etc.
///////////////////////////////////////////////////////////////////////////////
class ActiveImage {
	constructor() {
		this.isready = false,
		this.redraw = true,
		this.update = false,

		this.type = '';
		this.id = '';
		this.group = '';
		this.context = 0;
		this.sprites = {};
		this.inputFocus = false;
		this.origin = new Vector2d(0,0);
		this.rect = new Rect(0, 0, 0, 0);
		this.visible = true;
		//TODO
		this.hidden = false;
		this.scale = [1,1];
	}
	Create(id, rect, sprites) {
		let canvas = document.createElement('canvas');
		canvas.id = escape(id);
		this.id = id;
		this.context = canvas.getContext('2d');
		this.text = id;
		this.rect = rect;
		this.origin = new Vector2d(this.rect.x, this.rect.y);

		this.context.canvas.setAttribute('width',this.rect.w);
		this.context.canvas.setAttribute('height',this.rect.h);
		this.isready = true;
	}
	Update(elapsed) {
        this.visible = !this.hidden;
        return this.update;
	}
	Draw() {
        if (!this.isready) return false;
        if (!this.redraw) return false;
    
    	this.redraw = false;
        this.update = true;
        return true;
	}
	Fill(obj) {
		this.context.fillStyle = obj;
		this.context.fillRect(0,0,this.context.canvas.width,this.context.canvas.height);
	}

}

///////////////////////////////////////////////////////////////////////////////
// Button class
///////////////////////////////////////////////////////////////////////////////
class Button extends ActiveImage {
    constructor(param) {
		super();
        this.type = 'button';
        this.text = '';
        this.showText = true;
        this.align = 'center';
        this.tooltip = '';
        this.on = false;
		this.link = '';
		this.state = '';
		this.prev_state = '',

        let rect = new Rect(param.x, param.y, param.w)?param.w:0, (param.h)?param.h:0);
        let sprites = {};
        if (param.base)
			sprites["base"] = param.base;
        else 
			sprites["base"] = "rgba(224,224,224,0.8)";
        if (param.hover)
			sprites["hover"] = param.hover;
        else 
			sprites["hover"] = "orange";
        if (param.click)
			sprites["click"] = param.click;
        else 
			sprites["click"] = "yellow";
        super.Create(param.name, rect, sprites);
				
        if (param.group) this.group = param.group;
        if (param.link) this.link = param.link;
        if (param.showText == false) this.showText = false;
        if (param.align) this.align = param.align;
        if (param.tip) this.tooltip = param.tip;
        if (param.hidden) this.hidden = param.hidden;
        if (param.scale) this.scale = param.scale;
        if (this.hidden) this.visible = false;
        
        // hidden parameters
        if (param.focus) this.inputFocus = param.focus;
        if (param.state) { 
            this.prev_state = param.state;
            this.state = param.state;
        }
	}
	Update(elapsed) {
		if (!this.visible)
			this.inputFocus = false;
		else {
			if (this.prev_state != this.state) {
				this.prev_state = this.state;
				this.redraw = true;	
				if ((this.state == 'hover') || (this.state == 'clicked')) {
					this.inputFocus = true;
					if (this.tooltip != '') Stage.Transition(1.0);
				}
				else
					this.inputFocus = false;
			}
			/*
			if (!Stage.activeForm && Stage.mouseClick && obj.inputFocus) {
				if (obj.link != null) {
					var ret = obj.link[0](obj.link[1]);
					// TODO: bugfix, any other commands other than set that needs a pause?
					Stage.pause = (obj.link && (obj.link[0] == set)) || (ret == true);
					//Stage.pause = false;
				}
				obj.redraw = true;
			}*/
			return super.Update(elapsed);
		}
	}
}


ActiveImage.prototype.Update = function(elapsed) {
	var that = this;
	if (this.isready) {
		if (!this.visible)
			this.inputFocus = false;
		else
			CformElements[this.type]['_update'](this, elapsed);
	}
	return this.update;
}
ActiveImage.prototype.Draw = function() {
	if (!this.isready) return false;
	if (!this.redraw) return false;

	if (this.visible == this.hidden)
		this.visible = !this.hidden;

	if (this.visible) {
		this.context.clearRect(0,0,this.context.canvas.width,this.context.canvas.height);
		CformElements[this.type]['_draw'](this);
		if ((this.showText) && (this.text != '')) {
			this.context.textBaseline = 'middle';
			this.context.textAlign = this.align;
			if (Stage.formStyle.length > 0)
				this.context.font = Stage.formStyle[0];
			if (Stage.formStyle.length > 1)
				this.context.fillStyle = Stage.formStyle[1];
			if (this.align == 'left')
				this.context.fillText(this.text, 0,this.rect.h/2);
			else if (this.align == 'right')
				this.context.fillText(this.text, this.rect.w,this.rect.h/2);
			else
				this.context.fillText(this.text, this.rect.w/2,this.rect.h/2);
		}			
		if (this.link != null) {
			// create a detectable path
			this.context.beginPath();
			this.context.rect(this.rect.x,this.rect.y,this.scale[0]*this.rect.w,this.scale[1]*this.rect.h);
			this.context.closePath();
		}
	}
	this.redraw = false;
	this.update = true;
	return true;
}






///////////////////////////////////////////////////////////////////////////////
// Button class
///////////////////////////////////////////////////////////////////////////////
class Button extends ActiveImage {
    constructor(param) {
        super();
        this.type = 'button';
        this.text = '';
        this.showText = true;
        this.align = 'center';
        this.tooltip = '';
        this.on = false;

        let rect = new Rect(param.x, param.y, (param.w)?param.w:0, (param.h)?param.h:0);
        let sprites = {};
        let ret = null;
        if (param.base) {
            ret = Helper.findVar(param.base);
            if (ret) sprites["base"] = ret;
            else sprites["base"] = param.base;
        }
        else sprites["base"] = Config.activeTheme.menuBase;
        if (param.hover) {
            ret = Helper.findVar(param.hover);
            if (ret) sprites["hover"] = ret;
            else sprites["hover"] = param.hover;
        }
        else sprites["hover"] = Config.activeTheme.menuHover;
        if (param.click) {
            ret = Helper.findVar(param.click);
            if (ret) sprites["click"] = ret;
            else sprites["click"] = param.click;
        } 
        else sprites["click"] = Config.activeTheme.menuClick;
        
        super.Create(param.name, rect, sprites);

        if (param.group) this.group = param.group;
        if (param.link) this.link = param.link;
        if (param.showText == false) this.showText = false;
        if (param.align) this.align = param.align;
        if (param.tip) this.tooltip = param.tip;
        if (param.hidden) this.hidden = param.hidden;
        if (param.scale) this.scale = param.scale;
        if (this.hidden) this.visible = false;
        
        // hidden parameters
        if (param.focus) this.inputFocus = param.focus;
        if (param.state) { 
            this.prev_state = param.state;
            this.state = param.state;
        }
    }
    showTooltip() {
        if (Helper.checkMapAccess(this.group, this.id)) {
            let style = new PIXI.TextStyle();
            let subs = Helper.parseFontString(Config.activeTheme.formTipStyle);
            [style.fontStyle, style.fontSize, style.fontFamily, style.fill] = subs;
            this.glTipText.style = style;
            this.glTipText.text = this.tooltip;
            this.glTipText.position.x = 5;
            
            let w = this.glTipText.width+10, h = parseInt(subs[1])+4, 
                x = Math.min(Stage.coord.vx, Stage.canvas.width - w - 5),
                y = Math.max(Stage.coord.vy-12, 2*h + 5);
            this.glTip.clear();
            let col = w3color(Config.activeTheme.formTipColor);
            this.glTip.beginFill(col.toVal(), col.toRgb().a);
            this.glTip.drawRect(0, 0, w,  h);
            this.glTip.endFill();
            this.glTip.position.set(x,y);
            this.glTip.alpha = 1.0;
            this.redraw = true;
        }
    }
    hideTooltip() {
        this.glTip.alpha = 0.0;
        this.redraw = true;
    }
    setText() {
        let ret = Helper.findVar(this.id);
        //this.text = ret ? ret : this.id;
        if (ret) this.text = ret;
    }
    checkClicked() {
        if (Stage.mouseClick && this.inputFocus) {
            if (this.link != null) {
                let ret = this.link[0](this.link[1], (this.link[2]?this.link[2]:false));
                //Stage.pause = (this.link && (this.link[0] == set)) || (ret == true);
                Stage.pause = (ret == true);
            }
        }
    }
    setTexture(texture) {
        if (Helper.checkIfImage(texture)) {
            this.glSprite.texture = Stage.glManager.getTexture(texture);
            this.glBack.alpha = 0.0;
            this.glSprite.alpha = 1.0;
        }
        else {
            this.glBack.clear();
            // support button as border
            if (texture == 'border') {
                let x=0, y=0, r=5, w=this.rect.w, h=this.rect.h;
                let col = w3color(Config.activeTheme.menuBase);
                if (this.state == "hover")
                    col = w3color(Config.activeTheme.menuHover)
                else if (this.state == "click")
                    col = w3color(Config.activeTheme.menuClick)
                this.glBack.beginFill(col.toVal(), 0);
                this.glBack.lineStyle(2,col.toVal(),1);
                //this.glBack.drawRoundedRect(0, 0, this.rect.w, this.rect.h);
                this.glBack.moveTo(x+r, y);
                this.glBack.lineTo(w-r, y);
                this.glBack.quadraticCurveTo(w, y, w, y+r);
                this.glBack.lineTo(w, h-r);
                this.glBack.quadraticCurveTo(w, h, w-r, h);
                this.glBack.lineTo(x+r, h);
                this.glBack.quadraticCurveTo(x, h, x, h-r);
                this.glBack.lineTo(x, y+r);
                this.glBack.quadraticCurveTo(x, y, x+r, y);
                this.glBack.endFill();
            }
            else {
                let col = w3color(texture);
                this.glBack.beginFill(col.toVal(), col.toRgb().a);
                this.glBack.drawRect(0, 0, this.rect.w,  this.rect.h);
                this.glBack.endFill();
            }
            this.glBack.position.set(0,0);
            this.glBack.alpha = 1.0;
            this.glSprite.alpha = 0.0;
        }
    }
    Update(elapsed) {
        if (!this.visible)
            this.inputFocus = false;
        else {
            if (Helper.checkMapAccess(this.group, this.id)) {
                if (this.prev_state != this.state) {
                    // TODO: there is a change of state here, play indicative sound
                    if ((this.prev_state=='base') && (this.state=='hover')) {
                        //play hover entry sound once
                        if (Config.activeTheme.seHover) audio({se:Config.activeTheme.seHover});
                        //console.log('[VNC]: play hover entry');
                    }
                    else if (this.state=='click') {
                        //play click sound once
                        if (Config.activeTheme.seClick) audio({se:Config.activeTheme.seClick});
                        console.log('[VNC]: play click once');
                    }
                    this.prev_state = this.state;
                    this.redraw = true;
                    if ((this.state=='hover') || (this.state=='click')) {
                        this.inputFocus = true;
                        if (this.tooltip != '') Stage.Transition(1.0);
                    }
                    else if (!this.id.includes('--dummy--'))
                        this.inputFocus = false;
                    this.setTexture(this.sprites[this.state]);
                }
                if (this.showText) {
                    this.setText();
                    if (this.text != this.glText.text) {
                        let style = new PIXI.TextStyle();
                        [style.fontStyle, style.fontSize, style.fontFamily, style.fill] = Stage.formStyle;
                        style.align = this.textAlign;
                        this.glText.style = style;
                        this.glText.text = this.text;

                        this.glText.alpha = 1.0;
                        this.glText.anchor.set(0,0.5);
                    }
                }
                else
                    this.glText.alpha = 0.0;
                this.checkClicked();
            }
        }
        return super.Update(elapsed);
    }
    Draw() {
        if (!this.isready) return false;
        if (!this.redraw) return false;
        
        this.glImage.visible = this.visible;
        if (this.visible) {
            this.glBack.position.set(this.rect.x, this.rect.y);
            this.glBack.scale.set(this.scale[0], this.scale[1]);
            this.glSprite.position.set(this.rect.x, this.rect.y);
            this.glSprite.scale.set(this.scale[0], this.scale[1]);
            if (this.align == 'center') {
                this.glText.anchor.x = 0.5;
                this.glText.position.set(this.rect.x+this.rect.w/2, this.rect.y+this.rect.h/2);
            }
            else if (this.align == 'right') {
                this.glText.anchor.x = 1.0;
                this.glText.position.set(this.rect.x+this.rect.w, this.rect.y+this.rect.h/2);
            }
            else{
                this.glText.anchor.x = 0;
                this.glText.position.set(this.rect.x, this.rect.y+this.rect.h/2);
            }
        }
        return super.Draw();
    }
}
