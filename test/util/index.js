/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
const expect = require('chai').expect;

const utils = require('../../util');

describe('util/index.js', () => {
    describe('findClientId()', () => {
        it('should return id with length 12 and readable', () => {
            const id = utils.findClientId();

            expect(id).to.have.lengthOf(12);
            expect(/[Il0O]/.test(id)).to.be.false;
        });

        it('should return different id than the given one', () => {
            const id = utils.findClientId({ '123456abcdef': {} });

            expect(id).to.not.equal('123456abcdef');
        });
    });

    describe('randomInt()', () => {
        it('should return int and between args', () => {
            const int = utils.randomInt(1, 10);

            expect(int).to.be.a('number');
            expect(int).to.be.within(1, 10);
        });
    });

    describe('getValueByPath()', () => {
        it('should return value by path', () => {
            const variable = utils.getValueByPath({ a: { b: 1 } }, 'a.b');

            expect(variable).to.equal(1);
        });

        it('should return undefined if path not found', () => {
            const variable = utils.getValueByPath({ a: { c: 1 } }, 'a.b');

            expect(variable).to.be.undefined;
        });

        it('should return undefined if no object given', () => {
            const variable = utils.getValueByPath(undefined, 'a.b');

            expect(variable).to.be.undefined;
        });
    });

    describe('setValueByPath()', () => {
        it('should set value by path', () => {
            const obj = {};
            const obj2 = utils.setValueByPath(obj, 'a.b', 2);
            const obj3 = utils.setValueByPath({ a: {} }, 'a.b', 2);

            expect(obj).to.deep.equal({ a: { b: 2 } });
            expect(obj2).to.deep.equal({ a: { b: 2 } });
            expect(obj3).to.deep.equal({ a: { b: 2 } });
        });

        it('should return undefined if no object given', () => {
            const variable = utils.setValueByPath(undefined, 'a.b', 2);

            expect(variable).to.be.undefined;
        });

        it('should set value with array syntax', () => {
            const variable = utils.setValueByPath({}, 'a[0]', 2);
            const variable2 = utils.setValueByPath({ a: [1] }, 'a[1]', 2);

            expect(variable).to.deep.equal({ a: [2] });
            expect(variable2).to.deep.equal({ a: [1, 2] });
        });
    });

    describe('deleteByPath()', () => {
        it('should delete value by path', () => {
            const obj = { a: { b: 2 }, c: 2 };
            utils.deleteByPath(obj, 'a.b');

            expect(obj).to.deep.equal({ a: {}, c: 2 });
        });

        it('should nothing if not found', () => {
            const obj = { a: { b: 2 }, c: 2 };
            utils.deleteByPath(obj, 'a.c');

            expect(obj).to.deep.equal({ a: { b: 2 }, c: 2 });
        });

        it('should nothing if undefined given', () => {
            const obj = { a: { b: 2 }, c: 2 };
            utils.deleteByPath(undefined, 'a.c');

            expect(obj).to.deep.equal({ a: { b: 2 }, c: 2 });
        });
    });

    describe('arraysEqual()', () => {
        it('should compare to equal arrays as true', () => {
            expect(utils.arraysEqual([1], [1])).to.be.true;
        });

        it('should compare to non equal arrays as false', () => {
            expect(utils.arraysEqual([1], [2])).to.be.false;
            expect(utils.arraysEqual([1, 1], [2])).to.be.false;
        });
    });

    describe('object2pathlist()', () => {
        it('should return same object if flat', () => {
            const list = utils.object2pathlist({ a: 1, b: 2 });

            expect(list).to.deep.equal({ a: 1, b: 2 });
        });

        it('should return pathlist if deep', () => {
            const list = utils.object2pathlist({ a: { b: 1, c: 2 }, d: 2 });

            expect(list).to.deep.equal({ 'a.b': 1, 'a.c': 2, d: 2 });
        });

        it('should return pathlist if deeper', () => {
            const list = utils.object2pathlist({ a: { b: 1, c: { e: 1, f: 2 } }, d: 2 });

            expect(list).to.deep.equal({ 'a.b': 1, 'a.c.e': 1, 'a.c.f': 2, d: 2 });
        });

        it('should return complex pathlist if every is true', () => {
            const list = utils.object2pathlist({ a: { b: 1, c: 2 }, d: 2 }, true);

            expect(list).to.deep.equal({ a: { b: 1, c: 2 }, 'a.b': 1, 'a.c': 2, d: 2 });
        });

        it('should return more complex pathlist if every is true', () => {
            const list = utils.object2pathlist({ a: { b: 1, c: { e: 1, f: 2 } }, d: 2 }, true);

            expect(list).to.deep.equal({ a: { b: 1, c: { e: 1, f: 2 } }, 'a.b': 1, 'a.c': { e: 1, f: 2 }, 'a.c.e': 1, 'a.c.f': 2, d: 2 });
        });
    });

    describe('getObjectPaths()', () => {
        it('should return path array', () => {
            const list = utils.getObjectPaths({ a: 1, b: 2 });

            expect(list).to.deep.equal(['a', 'b']);
        });
    });


    describe('findPort()', () => {
        it('should return default port 8001', async () => {
            const port = await utils.findPort();

            expect(port).to.equal(8001);
        });

        it('should return other port when given', async () => {
            const port = await utils.findPort(8005);

            expect(port).to.equal(8006);
        });
    });
});
