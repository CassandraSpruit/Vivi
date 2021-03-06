import {mapFilter, mapKeysToArray} from '@cspruit/array-like-map';
import {loadViviServices} from '../services/load-services.static';
import {Component} from '../models/component';
import {Service} from '../models/service';
import {Instance} from '../models/instance';
import {ServiceFactory} from './service-factory';
import {ComponentFactory} from './component-factory';

/**
 * Module Factory - Initial Constructor for the Vivi Framework
 *
 * @class ModuleFactory
 */
export class ModuleFactory {
	/**
	 * Creates an instance of ModuleFactory.
	 *
	 * @param {{componentConstructors: Array<typeof Component>, serviceConstructors: Array<typeof Service>, rootComponent: typeof Component, modules: Array<ModuleFactory>}} [module]
	 * 	- Component constructors: Array of Components to be initialized
	 * 	- ServiceConstructors: Array of Services to be initialized
	 *  - RootComponent: Component to be set as root. Must be set in the component constructors as well.
	 * @param {{log: ['verbose', 'info', 'warn', 'error', 'none']}} [options] - Options passed into the module
	 *  - loglevel: Log level of application
	 *      - none - no logging
	 *      - error - output only errors
	 *      - warn - output only errors and warnings
	 *      - info - output errors, warnings, and other information
	 * 	    - verbose - all levels, including debug information
	 * @param {Array<Service | {key: string, override: Service}>} [overrides] - An array of services that inherit a baked in service or can also specify by {key: override}
	 *     - Ex: ```new ModuleFactory(null, null, [MyCoolEventService, MyCoolerLogger]);``` - _(Provided MyCoolEventService extends AppEvent and MyCoolerLogger extends Logger)_
	 *     - Ex: ```new ModuleFactory(null, null, [{key: 'AppEvent', override: SomeWeirdEventService}, {key: 'Logger', override: SuperCustomLoggerService }]);```
	 * @memberof ModuleFactory
	 */
	constructor(module, options, overrides) {
		this.factories = new Map();
		module = module || {};
		this.options = options || {};
		overrides = overrides || [];
		this.directory = __dirname;

		// Load in common modules
		if (Array.isArray(module.modules)) {
			module.modules.forEach(childModule => {
				childModule.factories.forEach((value, key) => {
					this.factories.set(key, value);
				});
			});
		}

		// Init baked-in services and load overrides
		loadViviServices().forEach(service => {
			// Find override if it exists
			const override = overrides.find(override => override.key === service.name || Reflect.getPrototypeOf(override) === service);
			if (override) {
				this.factories.set(service.name, new ServiceFactory(override.key ? override.override : override, this));
			} else {
				this.factories.set(service.name, new ServiceFactory(service, this));
			}
		});

		// Init Services
		if (Array.isArray(module.serviceConstructors)) {
			module.serviceConstructors.forEach(serviceConstructor => {
				this.factories.set(serviceConstructor.name, new ServiceFactory(serviceConstructor, this));
			});
		}

		if (Array.isArray(module.componentConstructors)) {
			// Init Components
			module.componentConstructors.forEach(constructor => {
				this.factories.set(constructor.name, new ComponentFactory(constructor, this));
			});
		}

		if (module.rootComponent) {
			// Mount root component
			const rootFactory = this.getFactory(module.rootComponent);
			// @todo Add ability to make root component append to a user-specified node
			rootFactory.createRoot();
		}

		// Initialize
		this.start();
	}

	/**
	 *Creates a Component or Service factory based off of constructor
	 *
	 * @param {typeof Service | typeof Component} constructor - Service or Component to be created with Factory
	 * @returns {ServiceFactory | ComponentFactory} - Resulting Factory. Will return a ServiceFactory or ComponentFactory based off of name of constructor.
	 * @memberof ModuleFactory
	 */
	createFactory(constructor) {
		let factory;
		const matches = constructor.name.match(/(.*)(Component)$/);
		if (matches && matches[2] && matches[2] === 'Component') {
			factory = new ComponentFactory(constructor, this);
		} else {
			factory = new ServiceFactory(constructor, this);
		}

		this.factories.set(constructor.name, factory);

		return factory;
	}

	/**
	 * Fetches a service or component from the constructor. If an id is not specified, it'll grab the last instance of that service or component.
	 *
	 * @param {typeof Service | typeof Component | typeof Instance | string} constructor - Constructor or string of instance to be fetched
	 * @param {string} [id] - Id of instance to be fetched
	 * @returns {Service | Component | Instance }If an id is specified, that component/service instance. Otherwise the last created instance of that service/component
	 * @memberof ModuleFactory
	 */
	get(constructor, id) {
		return this.getFactory(constructor).get(id);
	}

	/**
	 * Fetches a service factory or component factory from the service or component constructor
	 *
	 * @param {typeof Service | typeof Component | string} instance - Instance that is created from factory
	 * @returns {ServiceFactory | ComponentFactory } If found, ServiceFactory or ComponentFactory of component/service
	 * @memberof ModuleFactory
	 */
	getFactory(instance) {
		const instanceName = typeof instance === 'string' ? instance : instance.name;
		const inst = this.factories.get(instanceName);
		if (inst) {
			return inst;
		}

		// Double check this isn't blowing up on the logger otherwise this goes into an infinite loop
		if (instanceName === 'Logger') {
			throw new Error(`No service factory or component factory found for ${instanceName}`);
		} else {
			this.get('Logger').error(`No service factory or component factory found for ${instanceName}`, [{key: 'instance', value: instance}]);
		}
	}

	/**
	 * Returns all component names registered in an array
	 *
	 * @returns {Array<string>} - Component names as an array
	 * @memberof ModuleFactory
	 */
	getComponentRegistry() {
		return mapKeysToArray(mapFilter(this.factories, value => value instanceof ComponentFactory));
	}

	/**
	 * Placeholder event loop for any code to be run immediately after Vivi has finished initalizing
	 *
	 * @memberof ModuleFactory
	 */
	start() {}
}
