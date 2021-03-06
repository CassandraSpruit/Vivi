import test from 'ava';
import {Logger} from '../logger';
import {ModuleFactory} from '../../factory/module-factory';

const vivi = new ModuleFactory();
const service = vivi.get('Logger');
test('should init', t => {
	const actual = new Logger(vivi);
	t.assert(actual);
});

test('error should log errors', t => {
	// Error here is valid
	service.error('This error is valid. Disregard.');
	t.pass();
});

test('warn should log warning', t => {
	// Warning is valid
	service.warn('This warning is valid. Disregard.');
	t.pass();
});

test('log should log information', t => {
	service.info('This info is valid. Disregard.');
	t.pass();
});

test('debug should log debug messages', t => {
	service.debug('This log is valid. Disregard.');
	t.pass();
});
