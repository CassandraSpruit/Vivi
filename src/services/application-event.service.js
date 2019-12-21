import { BehaviorSubject } from 'rxjs';
import {ApplicationListener} from '../events/application-listener';
import {Service} from '../models/service';

export class ApplicationEventService extends Service {
    eventRegistry = new Map();

    sendEvent(eventName, data, closeAfterEvent) {
        const evt = { data, closeOnComplete: closeAfterEvent };

        // Get event in registry
        const reg = this.eventRegistry.get(eventName);

        // Set event in registry if doesn't exist
        if (!reg) {
            this.eventRegistry.set(eventName, new BehaviorSubject(evt));
        } else {
            // Send next event in subscribers
            reg.next(evt);
        }
    }

    createListener(eventName, callback, options) {
        // Try to get event in registry
        const reg = this.eventRegistry.get(eventName);
        let sub = reg || new BehaviorSubject({ data: null });
        if (!reg) {
            this.eventRegistry.set(eventName, sub);
        }

        let obs = sub.asObservable();

        // Behavior subjects return current value by default, so work around that unless otherwise stated
        if (!(options && options.getCurrentValue)) {
            obs = obs.pipe(skip(1));
        }

        // Include other pipes if provided
        if (options && options.pipe) {
            obs = obs.pipe(options.pipe);
        }

        // Create listener
        return new ApplicationListener(eventName, callback, obs);
    }
}