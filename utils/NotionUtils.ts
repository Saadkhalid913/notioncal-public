import { Client } from "@notionhq/client";
import { CalendarEventSchema, NotionAccessToken } from "../main";

export async function CreateDatabase(pageID: string, auth: NotionAccessToken["access_token"], DBName:string): Promise<{id: string, url: any}> {
    const NotionClient = new Client({ auth })
    try {
    const response = await NotionClient.databases.create({
        parent: {
            type: "page_id",
            page_id: pageID,
        },
        title: [
            {
                type: "text",
                text: { content: DBName }
            }
        ],
        properties: {
            "Event Name": {
                title: {}
            },
            "Description": {
                rich_text: {}
            },
            "Date": {
                date: {}
            }
        }
    })  
    // @ts-ignore
    return {id: response.id, url: response.url}
    }
    catch(err) {
        throw new Error("There was an error creating database")
    }
}

export async function AddEventToNotion(event: CalendarEventSchema, auth: string, database_id: string) {
    const NotionClient = new Client({auth})
    
    const { start, end, summary, description } = event
    if ( !start || !start.dateTime || !end || !summary ) return 

    const response = await NotionClient.pages.create({
        parent: {
            database_id: database_id
        },
        properties: {
            "Event Name": {
                title: [
                    {text: {
                        content: summary
                    }}
                ]
            },
            Date: {
                date: {
                    start: start.dateTime!,
                    end: end.dateTime,
                }
            },
            Description: {
                rich_text: [
                    {
                        text: {
                            content: description || ""
                        }
                    }
                ]
            }
        }
    }).catch(err => {throw new Error("Could not find the page you're looking for")})
    return response?.id
} 

export async function GetUserNotionPages(auth: NotionAccessToken["access_token"], NextCursor? : string) {
    const NotionClient = new Client({auth})
    const response = await NotionClient.search({
        filter: {
            property: "object",
            value: "page"
        },
        sort: {
            timestamp: "last_edited_time",
            direction: "descending"
        },
        start_cursor: NextCursor
    })

    return response
}

export function GenerateNotionAuthURL() {
    const authURL = new URL("https://api.notion.com/v1/oauth/authorize")
    authURL.searchParams.append("client_id", process.env.notion_oauth_id!)
    authURL.searchParams.append("redirect_uri", process.env.client_origin + "/oauth/notion")
    authURL.searchParams.append("response_type", "code")
    authURL.searchParams.append("owner", "user")
    return authURL
}

export function RequestAccessToPage() {
    return GenerateNotionAuthURL()
}