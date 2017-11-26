﻿/**
 * Simple events list graphic
 * Using the UIItem API
 */

import UIUtil = require('./UIUtil');
import TimeUtil = require('../TimeFormatUtil');
import EventData = require('../WHSLib/Interfaces/EventData');
import ColorUtil = require('./ColorUtil');

class EventGraphic extends UIUtil.UIItem {
    //setup update callbacks with recv
    recvParams: Array<UIUtil.RecvParams>; 
    //other stuff
    private dispSched: boolean;
    //storage title
    private readonly header: string;
    //storage document item
    private elem: HTMLElement;
    //template for overall
    private readonly wrap: string = `<div id="{{id}}">{{stuff}}</div>`
    private readonly templateStr: string = `
            <p class="header">{{head}}</p>
            {{stuff}}`;
    //and template for each item
    //100% certified unreadable
    //event item template
    private readonly eventTemplate: string = `
        <div class="evRow {{modCl}}">
            <div class="leftCell"> 
                <div class="incep"> 
                    {{time}}
                </div> 
            </div>
            <div class="rWrap" style="border-left: 2px solid {{lineColor}}">
                <p class="evRight">{{name}}</p> 
            </div>
        </div>`;
    //time templates
    private readonly normalTime: string = `
    <p class="leftUp">{{start}}</p> 
    <p class="leftLow">{{end}}</p>`

    private readonly allDayTime: string = `
    <p class='leftUp' style='margin:0'>ALL DAY</p>`

    private readonly charLineMax: number = 32;

    //constructor for teh evenents
    constructor(header: string, day: number, displaySchedule?: boolean) {
        super();
        this.recvParams = [
            //events
            <UIUtil.CalParams>{
                type: UIUtil.RecvType.CAL,
                dayStart: 1,
            }
        ];
        this.header = header;
        this.dispSched = displaySchedule;
    }
    //and the funtion itself!
    //we specify the contents of the args array in the varible above
    onInit(data: Array<any>): string {
        //the data will be fed to us in a tuple indexed by recvType
        //we only need the events for the today, so start with that
        return UIUtil.templateEngine(this.wrap, {
            id: this.id,
            stuff: this.buildEventHTML(data[UIUtil.RecvType.CAL]["events"], new Date().setHours(0, 0, 0, 0), new Date().setHours(23, 59, 59, 999)),
        });
    }

    //store document objects
    buildJS() {
       this.elem = document.querySelector('#' + this.id) as HTMLElement;
    }

    //master update func
    //update if necessary

    onUpdate(data: Array<any>) {
        //if the event cahce has been populated
        let temp = data[UIUtil.RecvType.CAL]["events"][new Date().setHours(0, 0, 0, 0)];
        //if updated, update!
        if (temp) this.elem.innerHTML = this.buildEventHTML(temp, new Date().setHours(0, 0, 0, 0), new Date().setHours(23, 59, 59, 999));
    }

    //actual html building func
    private buildEventHTML(eventData: any | false, start: number, end: number) {
        
        if (eventData) {
            let events: Array<EventData.EventInterface> = Object.keys(eventData).filter((time: string) => { let num = parseInt(time); return num >= start && num <= end; }).map((key) => { return eventData[key]; });
            let length = events.length;
            if (length <= 0) return ''
            //if there is a schedule title, it's in our storage member
            let eventStr = '';
            let schedNameIndex;
            if (this.dispSched) {
                schedNameIndex = events.findIndex((ev) => { return ev.schedule; });
                let schedName = events[schedNameIndex].title;
                eventStr += UIUtil.templateEngine(this.eventTemplate, {
                    modCl: 'evSmall',
                    time: this.allDayTime,
                    name: schedName ? schedName + ' Schedule' : 'No School',
                });
            }
            //yay!
            //do templating after so we can have line color fancyness
            let inv = 1.0 / (length - 1);
            for (let i = 0; i < length; i++) {
                if (i != schedNameIndex) {
                    let eventProp: any = {
                        //if it isn't all day, do templating, else use ALL DAY template instead
                        //beware nested conditional
                        time: !events[i].isAllDay ? UIUtil.templateEngine(this.normalTime, {
                            start: TimeUtil.asSmallTime(events[i].startTime),
                            end: TimeUtil.asSmallTime(events[i].endTime),
                        }) : this.allDayTime,
                        //add extra modifier class if it's all day as well
                        modCl: !events[i].isAllDay ? '' : 'evSmall',
                        name: events[i].title,
                    }
                    //set linecolor
                    if (events.length === 1) eventProp.lineColor = '#00ff00';
                    else eventProp.lineColor = ColorUtil.blendColors('#00ff00', '#004700', (schedNameIndex ? i + 1 : i) * inv);
                    //add breakline tags to long titles
                    while (eventProp.name.length >= this.charLineMax) {
                        //work on the substring ending at the 64th char
                        //starting at the 64th char, and work backwards until we find a space
                        let breakPoint = (<string>eventProp.name).slice(0, this.charLineMax).lastIndexOf(' ');
                        //add a break tag to that space
                        eventProp.name = (<string>eventProp.name).slice(0, breakPoint) + `<br/>` + (<string>eventProp.name).slice(breakPoint + 1);
                    }
                    eventStr += UIUtil.templateEngine(this.eventTemplate, eventProp);
                }
                //return!
                return UIUtil.templateEngine(this.templateStr, {
                    head: this.header,
                    stuff: eventStr,
                });
            }
        }
        else return '';
    }
}

export = EventGraphic;