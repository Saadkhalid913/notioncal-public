export default class BaseError extends Error {
    public readonly details: ErrorDetails | undefined
    public readonly message: string
    constructor(
        message: string,
        details?: ErrorDetails
    ) {
        super(message)
        Object.setPrototypeOf(this, BaseError.prototype)
        this.details = details 
        this.message = message
    }
}

interface ErrorDetails {
    functionName?: string,
    fileName?: string,
    userID?: string,
    resource?: Object,
    endUserMessage?: string
}
