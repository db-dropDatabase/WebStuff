/*
 * Event interface structure thingy, designed to make storing, parseing, and reading google calendar stuff
 * that much easier
 */

interface EventInterface {
    isAllDay: boolean;
    startTime: Date;
    endTime: Date;
    dayString: string;
    name: string;
    id: string;
}

export = EventInterface;