"use client";
import { useParams } from "next/navigation";
import { MovementDetailPage } from "@/features/pages";
export default function Page() { const params = useParams<{ id: string }>(); return <MovementDetailPage id={params.id} />; }
