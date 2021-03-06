/**
 * Parent class for ServiceFactory and ComponentFactory. Can create generic instances.
 *
 * @class Factory
 */
export class Factory {
	constructor(constructorFn, vivi) {
		if (!vivi) {
			// This error would cause an error _with_ the error logger, so throw it like a normal error
			throw new ReferenceError('ModuleFactory is required.');
		}

		if (!constructorFn) {
			this.vivi.get('Logger').error('Constructor function for Instance class required.');
			return;
		}

		this.counter = 1;
		this.construct = constructorFn;
		this.instances = new Map();
		this.vivi = vivi;
	}

	/**
	 * Creates an instance of the instance/component/service
	 *
	 * @param {*} [data] - Data to be passed to instance
	 * @returns {*} - Returns resulting instance
	 * @memberof Factory
	 */
	create(data) {
		const instance = new this.construct(this.vivi); // eslint-disable-line new-cap
		instance.setData(this.counter, data);
		this.counter++;
		this.instances.set(instance.id, instance);

		return instance;
	}

	/**
	 *Returns an instance from the Factory
	 *
	 * @param {string} [id] - Optional
	 * @returns {*} - Instance from the Factory that matches the id or latest created if no id is provided
	 * @memberof Factory
	 */
	get(id) {
		if (id) {
			const instance = this.instances.get(id);
			if (instance) {
				return instance;
			}

			this.vivi.get('Logger').error(`${this.construct.name}: No instance found with id: ${id}`);
			return;
		}

		return [...this.instances.values()][this.instances.size - 1] || null;
	}

	/**
	 *Removes the instance from the Map and runs the destroy hook for that instance
	 *
	 * @param {string} id - Id of componet to be destroyed
	 * @memberof Factory
	 */
	destroy(id) {
		const instance = this.get(id);
		if (!instance) {
			this.vivi.get('Logger').warn(
				`Error destroying instance ${id}. Id does not exist in factory.`,
				[{key: 'Factory', value: this}]
			);
			return;
		}

		// Run cleanup
		instance.destroy();

		// Remove from the map
		this.instances.delete(id);
	}

	/**
	 *Runs destroy for all instances
	 *
	 * @memberof Factory
	 */
	destroyAll() {
		this.instances.forEach(instance => this.destroy(instance.id));
	}
}
