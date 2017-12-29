﻿/**
 * A sliding tab system for the bottom content UI
 * takes a buncha HTML strings created from individual UIItems, horizontally flatmaps them,
 * and then displays them in android-style moving tab thingys
 * IDK how I'm going to handle touch and stuff yet
 * LOL NVM FUCK TOUCH. LIBRARY HERE WE COME
 */

import UIUtil = require('./UIUtil');
import HTMLMap = require('../HTMLMap');
import lory = require('../lory');
import ButtonUI = require('./ButtonUI');
import TimeFormatUtil = require('../TimeFormatUtil');
import IScroll = require('../iscroll-lite');

class SlideTabUI extends UIUtil.UIItem {
    id: string;
    private readonly superWrapperTempalte: string = `
        <div id="mainBar" class="topBar topH"><div class="textPos"><p id="mainBText" class="barText"></p></div></div>
        <div class="topPos topH">
            <div class="barShade"></div>
            <div id="menuButton" class="sideButton"></div>
        </div>
        <div class="js_slides">
            <div class="js_slide start"></div>
            <div>{{stuff}}</div>
        </div>
        <div style="height: 7.05vh"></div>
    `;
    //wrapper template to make everything horizontally flatmapped
    private readonly slideWrapperTemplate: string = `<div class="js_slide content">
                                                    <div id="{{id}}" class="scrollHack full">                    
                                                        <div class="scrollHack"> 
                                                            {{stuff}} 
                                                            <p><br></p>
                                                        </div>
                                                    </div>
                                                </div>`;
    //stored pages, to be flatmapped and shiz
    private readonly pages: Array<Array<UIUtil.UIItem>>;
    //stored names for buttons later on
    private readonly names: Array<string>;
    //stored date
    private dayUpdate: boolean;
    //storeage lory object
    private storly: any;
    //storage IScroll objects
    private iscroll: Array<any>;
    private scrollBody: Array<HTMLElement>;
    //resize stuff
    private resizePromise: Promise<number>;
    //fill them varlibles
    constructor(pages: Array<Array<UIUtil.UIItem>>, names: Array<string>, resizePromise: Promise<number>) {
        super();
        this.pages = pages;
        this.names = names;
        this.recvParams = UIUtil.combineParams([].concat.apply([], pages));
        this.resizePromise = resizePromise;
    }
    //and the getHTML
    onInit(data: Array<any>): void {
        //get all the htmls in parellel
        //this chaining is gonna be beutiful
        //for every array of pages
        HTMLMap.setSliderHTML(UIUtil.templateEngine(this.superWrapperTempalte, { stuff : this.pages.map((items: Array<UIUtil.UIItem>, index: number) => { return UIUtil.templateEngine(this.slideWrapperTemplate, { id: 's' + index, stuff: items.map((item) => { return item.onInit(data); }).join('') }); }).join('') })); //one. freaking. line
    }
    
    buildJS() {
        //resize menu to adjust to screen
        this.resizePromise.then((num) => {
            let list =  document.querySelectorAll('.topH');
            for(let i = 0, len = list.length; i < len; i++) (list.item(i) as HTMLElement).style.minHeight = 'calc(8.7vh + ' + num + 'px)';
        });
        //start up lory
        let thing = document.querySelector('body');
        this.storly = lory.lory(thing, {
            //snapping only to js_slide
            classNameSlide: 'js_slide',
            searchDepth: 1,
            //snappier scrolling
            slideSpeed: 300,
            snapBackSpeed: 200,
            ease: 'cubic-bezier(0.1, 0.57, 0.1, 1)',
            //disable overflow scrolling
            overflowScroll: false,
            //fancy indicators
            indicators: [{
                element: document.querySelector('#menuLine'),
                axis: 'x',
                speedRatio: -(1 / this.names.length), //TODO: Dynamically scale bottom menu and calculate at runtime
            },
            {
                element: document.querySelector('#textWrap'),
                axis: 'y',
                speedRatio: -0.3,
                maxSlide: 1
            },
            {
                element: document.querySelector('#mainBar'),
                axis: 'x',
                speedRatio: 1,
                maxSlide: 1
            }]
        });
        //then fire up the menu and menu buttons
        let htmlStr = '';
        //create a bunch of button objects, bind thier callbacks, then destroy them b/c they don't need updating
        let buttonRay = this.names.map((name, index) => {
            let button = new ButtonUI('menu', 'menuText', name, (() => this.storly.slideTo(index)).bind(this), null, null, true);
            htmlStr += button.onInit();
            return button;
        });
        //set the menu html
        HTMLMap.menuBar.innerHTML = htmlStr;
        //run all that menu javascript
        for (let i = 0, len = buttonRay.length; i < len; i++) buttonRay[i].buildJS();
        //set the top grey bar date correctly
        document.querySelector("#mainBText").innerHTML = TimeFormatUtil.asLongDayMonthText(new Date());
        this.dayUpdate = false;
        this.iscroll = new Array(this.pages.length);
        this.scrollBody = new Array(this.pages.length);
        for (let i = 0, len = this.pages.length; i < len; i++) {
            //cache id
            let id = '#s' + i;
            //store element
            this.scrollBody[i] = document.querySelector(id);
            //add IScroll
            this.iscroll[i] = new IScroll(id);
            //finally, run the JS of all the little dudes
            for (let o = 0, len1 = this.pages[i].length; o < len1; o++) this.pages[i][o].buildJS();
        } 
    }

    //onUpdate calls the update function of all the children
    onUpdate(data: Array<any>): void {
        let ray: Array<UIUtil.UIItem> = [].concat.apply([], this.pages);
        for(let i = 0, len = ray.length; i < len; i++) if(ray[i].onUpdate) ray[i].onUpdate(data);
        //recalc iscroll
        for(let i = 0, len = this.pages.length; i < len; i++) this.iscroll[i].refresh();
    }

    onTimeChanged(): void {
        let ray: Array<UIUtil.UIItem> = [].concat.apply([], this.pages);
        for(let i = 0, len = ray.length; i < len; i++) if(ray[i].onTimeChanged) ray[i].onTimeChanged(); 
    }
}

export = SlideTabUI;