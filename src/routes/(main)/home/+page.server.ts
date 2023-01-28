import type { Actions, PageServerLoad } from "./$types"
import { prisma, findPlaces } from "$lib/server/prisma"
import { roQuery } from "$lib/server/redis"
import { fail, redirect } from "@sveltejs/kit"

export const load: PageServerLoad = async ({ locals }) => {
	console.time("home")
	const session = await locals.validateUser()
	if (!session.session) throw redirect(302, "/login")

	async function Friends() {
		const friendsQuery = await roQuery(
			`
			MATCH (:User { name: $user }) -[r:friends]- (u:User)
			RETURN u.name as name
			`,
			{
				params: {
					user: session.user.username,
				},
			},
			false,
			true
		)

		let friends: any[] = []

		for (let i of friendsQuery || ([] as any)) {
			if (i.name)
				friends.push(
					await prisma.user.findUnique({
						where: {
							username: i.name,
						},
						select: {
							id: true,
							username: true,
							displayname: true,
							image: true,
							status: true,
						},
					})
				)
		}

		return friends
	}

	console.timeEnd("home")
	return {
		places: findPlaces({
			select: {
				name: true,
				slug: true,
				image: true,
			},
		}),
		friends: Friends(),
		feed: prisma.post.findMany({
			select: {
				author: {
					select: {
						id: true,
						displayname: true,
						image: true,
					},
				},
				posted: true,
				content: true,
			},
			orderBy: {
				posted: "desc",
			},
			take: 40,
		}),
	}
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = await locals.validateUser()
		if (!session.session) throw redirect(302, "/login")

		const data = await request.formData()
		const status = data.get("status")?.toString() || ""
		if (status.length <= 0) return fail(400, { msg: "Invalid status" })

		await prisma.post.create({
			data: {
				author: {
					connect: {
						username: session.user.username,
					},
				},
				content: status,
			},
		})
	},
}
