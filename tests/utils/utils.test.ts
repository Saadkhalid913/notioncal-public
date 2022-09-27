import * as utils from "../../utils/utils"
import request from "supertest"
import type { Server } from "http"
import prisma from "../../db"
import { User } from "@prisma/client"
import { GenerateAuthToken } from "../../UsersUtils/User"
let server: Server

beforeEach(() => { server = require("../../index")})
afterEach(() => { server && server.close() })

const test_email: string = process.env.test_email!

describe("Utilities and setup", () => {
    it("Test", () => {
        expect(true).toBeTruthy()
        expect(test_email).toBeTruthy()
    })

})

describe("Utilities and setup", () => {
    it("Credentials Getter", () => {
        const result = utils.getCreds()
        expect(result).toHaveProperty("web")
    })

    it("Should Generate an Auth JWT", async () => {
        const test_user = await prisma.user.findFirst({where: {email: test_email}})
        expect(test_user).toBeTruthy()
        const testJWT = GenerateAuthToken(test_user as User)
        expect(testJWT).toBeDefined()
    })
})

export async function GetJWT(): Promise<string> {
    const test_user = await prisma.user.findFirst({where: {email: test_email}})
    expect(test_user).toBeTruthy()
    const testJWT = GenerateAuthToken(test_user as User)
    return testJWT
}

describe("/api/profile", () => {
    it("Should get user profile info -- /api/profile/me", async () => {
        const test_user = await prisma.user.findFirst({where: {email: test_email}})
        const testJWT = GenerateAuthToken(test_user as User)
        const response = await request(server).get("/api/profile/me").set("auth", testJWT)
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty("id")
        expect(response.body).toHaveProperty("email")
        expect(response.body).toHaveProperty("calendars")
        expect(response.body).toHaveProperty("pages")
    })
})


describe("/api/notion", () => {

    it("Should get user's Notion pages -- /api/notion/pages/latest", async () => {
        const test_user = await prisma.user.findFirst({where: {email: test_email}})
        const testJWT = GenerateAuthToken(test_user as User)
        const NotionResponse = await request(server).get("/api/notion/pages/latest").set("auth", testJWT)
        expect(NotionResponse.body).toBeDefined()
        expect(NotionResponse.body).toBeInstanceOf(Array)
    })

    it("Should Create a new Notion Database and return ID -- /api/notion/database/create", async () => {
        const test_user = await prisma.user.findFirst({where: {email: test_email}})
        const testJWT = GenerateAuthToken(test_user as User)
        const NotionResponse = await request(server).get("/api/notion/pages/latest").set("auth", testJWT)
        expect(NotionResponse.body).toBeDefined()
        expect(NotionResponse.body).toBeInstanceOf(Array)
        const PageID = NotionResponse.body[0]?.id
        expect(PageID).toBeDefined()
        const DBResponse = await request(server).post("/api/notion/database/create").set("auth", testJWT).send({ PageID })
        expect(DBResponse.body).toBeDefined()
        expect(DBResponse.status).toBe(200)
        expect(DBResponse.body?.id).toBeDefined()
    })
})



describe("Getting User Info from PostgreSQL database using prisma client", () => {
    it("Should get user from database by email", async () => {
        const response = await prisma.user.findFirst({
            where: {email: test_email},
            select: {
                calendars: true,
                integrations: true,
                id: true,
                email: true
            }
        })
        expect(response).toHaveProperty("id");
        expect(response).toHaveProperty("email");
        expect(response).toHaveProperty("calendars");
        expect(response).toHaveProperty("integrations");
    })
})



afterAll(() => {
    server && server.close()    
})