import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getItem } from "@/lib/mockData";
import { ItemDetail } from "@/components/app/ItemDetail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = getItem(id);
  return { title: item?.title ?? "Tétel részletei" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getItem(id);
  if (!item) notFound();
  return <ItemDetail item={item} />;
}
