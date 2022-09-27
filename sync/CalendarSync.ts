import { CheckForUpdatedCalendarEvents } from "../utils/CalendarUtils";
import prisma from "../db";


export default async function main() {
    const REFRESH_INTERVAL_SIZE_SECONDS = 12
    let counter = 0
    setInterval(async () => {
        let integrations = await prisma.integration.findMany()
        for (let Integration of integrations) {
            const { owner_id, id, calendar_id, notionDatabaseID, nextSyncToken } = Integration
            if (!nextSyncToken) {
                return 
            }
            CheckForUpdatedCalendarEvents(owner_id,
                                        id,
                                        calendar_id, 
                                        notionDatabaseID, 
                                        nextSyncToken)
                                        .catch(err => console.log("ERROR ON INTEGRATION WITH ID #" + id, err)) 
        }
    }, 1000 * 3)
}
