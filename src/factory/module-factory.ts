import { Component, Service, ViviComponentConstructor, ViviServiceConstructor } from '../models';
import { loadViviServices } from '../services/load-services.static';
import { ViviComponentFactory } from './component-factory.class';
import { ViviServiceFactory } from './service-factory.class';
import { NodeTreeService } from '../services/node-tree.service';

export interface ViviFactoryConstructor {
    serviceConstructors?: Array<ViviServiceConstructor<Service>>,
    componentConstructors: Array<ViviComponentConstructor<Component>>,
    rootComponent: new (...args) => Component
}

export class ModuleFactory {
    services: Map<string, ViviServiceFactory<Service>> = new Map<string, ViviServiceFactory<Service>>();
    components: Map<string, ViviComponentFactory<Component>> = new Map<string, ViviComponentFactory<Component>>();

    constructor(
        module: ViviFactoryConstructor
    ) {
        // @todo Replace instances of window.vivi with an injected version
        window.vivi = this;

        // Append Vivi services - these should be before any custom services
        if (!module.serviceConstructors) {
            module.serviceConstructors = loadViviServices;
        } else {
            module.serviceConstructors.unshift(...loadViviServices);
        }

        // Init Services
        // @todo: Automatically load services in the services folder\
        module.serviceConstructors.forEach(serviceConstructor => {
            let prereqArr = [];
            if (serviceConstructor.prereqArr) {
                prereqArr = serviceConstructor.prereqArr.map(prereq => {
                    // @todo: Services - Throw a specific warning to the user telling them about a missing service
                    return this.services.get(prereq.name);
                });
            }
            this.services.set(serviceConstructor.constructor.name, new ViviServiceFactory(serviceConstructor.constructor, prereqArr));
        });

        // NodeTree is needed to inject into Factory
        const nodeTree = this.get(NodeTreeService) as NodeTreeService;

        // Init Components
        // @todo: Automatically load components in the components folder
        module.componentConstructors.forEach(constructor => {
            let serviceArr = [];
            if (constructor.services) {
                serviceArr = constructor.services.map(service => {
                    // @todo: Components - Throw a specific warning to the user telling them about a missing service
                    return this.services.get(service.name);
                });
            }
            this.components.set(constructor.constructor.name, new ViviComponentFactory(constructor.constructor, serviceArr, nodeTree));
        });

        // Mount root component
        const rootFactory = this.getFactory(module.rootComponent) as ViviComponentFactory<Component>;
        const rootComp = rootFactory.createRoot(nodeTree) as Component;
        rootComp.append();

        // Initialize
        this.start();
    }

    /*
    @todo set Module Factor.get as generic
    */
    get(constuctor: new (...args) => (Component | Service), id?: string): Component | Service {
        const name = constuctor.name;
        return this.getByString(name, id);
    }

    // Exposed for Debugging only
    getByString(name: string, id?: string): Component | Service {
        const matches = name.match(/(.*)(Component|Service)$/);
        if (matches && matches[2] && matches[2] === 'Service') {
            return this.services.get(name).get(id);
        }
        if (matches && matches[2] && matches[2] === 'Component') {
            return this.components.get(name).get(id);
        }
        throw 'No service or component for ' + name;
    }

    getFactory(constructor: new (...args) => (Component | Service)): ViviComponentFactory<Component> | ViviServiceFactory<Service> {
        const name = constructor.name;
        return this.getFactoryByString(name);
    }

    getFactoryByString(name: string): ViviComponentFactory<Component> | ViviServiceFactory<Service> {
        const matches = name.match(/(.*)(Component|Service)$/);
        if (matches && matches[2] && matches[2] === 'Service') {
            return this.services.get(name);
        }
        if (matches && matches[2] && matches[2] === 'Component') {
            return this.components.get(name);
        }
        throw 'No service or component for ' + name;
    }

    getComponentRegistry(): Array<string> {
        return Array.from(this.components.keys());
    }

    start() {
        // Placeholder
    }
}