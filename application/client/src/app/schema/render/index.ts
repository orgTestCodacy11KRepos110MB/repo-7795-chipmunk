export abstract class Render<T> {
    private _bound: T | undefined;
    public delimiter(): string | undefined {
        return undefined;
    }
    public columns(): number {
        return 0;
    }
    public getBoundEntity(): T | undefined {
        return this._bound;
    }
    public setBoundEntity(entity: T) {
        this._bound = entity;
    }
}
