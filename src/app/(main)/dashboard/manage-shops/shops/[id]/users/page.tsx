import { redirect } from "next/navigation";

// This route redirects to the parent shop details page
// The users section is displayed within the shop details page
export default function ShopUsersPage() {
  redirect("../");
}
