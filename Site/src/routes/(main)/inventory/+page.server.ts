import { authorise } from "$lib/server/lucia"
import pageQuery from "$lib/server/pageQuery"
import { Record, equery } from "$lib/server/surreal.ts"
import inventoryQuery from "./inventory.surql"

type Asset = {
	name: string
	price: number
	id: number
	type: number
}

export async function load({ locals, url }) {
	const { user } = await authorise(locals)
	const { page, checkPages } = pageQuery(url)

	const [assets, pages] = await equery<[Asset[], number]>(inventoryQuery, {
		user: Record("user", user.id),
		page,
	})
	checkPages(pages)

	return { assets }
}
