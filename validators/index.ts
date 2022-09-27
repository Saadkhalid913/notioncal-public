import joi from "joi"


const IntegrationWithoutExistingDB = joi.object({
    name: joi.string().min(1).max(255).required(),
    calendar_id: joi.string().min(1).max(255).required(),
    notionDatabaseID: joi.string().min(1).max(255),
    pageID: joi.string().min(1).max(255).required(),
})

export function ValidateIntegration(integration: Object) {
    return IntegrationWithoutExistingDB.validate(integration)
}


