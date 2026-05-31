"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Icon from "@shared/ui/Icon";
import { Button } from "@shared/ui/Button";
import { useBrandProfilesStorage } from "@features/brand-profile/model/useBrandProfileStorage";
import { seedDemoIfEmpty } from "@features/brand-profile/model/seed-demo";
import { usePersonasForProfile } from "@features/brand-profile/model/usePersonasStorage";
import { isSectionFilled } from "@features/sop/model/useSopStorage";
import { SOP_SECTION_ORDER } from "@features/sop/model/section-labels";
import SopCard from "@features/sop/ui/SopCard";
import PersonaCard from "@features/brand-profile/ui/PersonaCard";
import ProductCard from "@features/brand-profile/ui/ProductCard";
import { useProducts } from "@shared/lib/products";
import CopyReferenceSection from "@features/brand-profile/ui/CopyReferenceSection";

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="pt-2 border-t border-[var(--w-line-normal)]">
      <span className="font-semibold text-[11px] uppercase tracking-[0.04em] text-[var(--w-fg-alternative)]">
        {title}
      </span>
    </div>
  );
}

type ViewFieldVariant = "default" | "chip" | "prose" | "accent" | "accent-neutral" | "quote";

function ViewField({ label, value, variant = "default" }: { label: string; value?: string; variant?: ViewFieldVariant }) {
  const empty = <p className="m-0 font-medium text-[13px] text-[var(--w-fg-alternative)] italic">미입력</p>;

  function renderValue() {
    if (!value) return empty;
    switch (variant) {
      case "chip":
        return (
          <span className="inline-flex self-start items-center px-3 py-1.5 rounded-full bg-[var(--w-primary-soft)] font-semibold text-[13px] tracking-[0.008em] text-[var(--w-primary-normal)]">
            {value}
          </span>
        );
      case "prose":
        return (
          <div className="px-4 py-3 rounded-xl bg-[var(--w-bg-alternative)]">
            <p className="m-0 font-medium text-[13.5px] leading-[1.75] tracking-[0.008em] text-[var(--w-fg-normal)] whitespace-pre-wrap">
              {value}
            </p>
          </div>
        );
      case "accent":
        return (
          <div className="border-l-2 border-[var(--w-primary-normal)] pl-3">
            <p className="m-0 font-medium text-[14px] leading-[1.6] text-[var(--w-fg-strong)] whitespace-pre-wrap">
              {value}
            </p>
          </div>
        );
      case "accent-neutral":
        return (
          <div className="border-l-2 border-[var(--w-line-strong)] pl-3">
            <p className="m-0 font-medium text-[14px] leading-[1.6] text-[var(--w-fg-strong)] whitespace-pre-wrap">
              {value}
            </p>
          </div>
        );
      case "quote":
        return (
          <div className="relative px-4 pt-5 pb-3 rounded-xl bg-[var(--w-bg-alternative)]">
            <span className="absolute top-2 left-4 font-bold text-[28px] leading-none text-[var(--w-fg-alternative)] select-none">"</span>
            <p className="m-0 font-medium text-[13.5px] leading-[1.75] tracking-[0.008em] text-[var(--w-fg-normal)] whitespace-pre-wrap">
              {value}
            </p>
          </div>
        );
      default:
        return (
          <p className="m-0 font-medium text-[14px] leading-[1.6] text-[var(--w-fg-strong)] whitespace-pre-wrap">
            {value}
          </p>
        );
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-semibold text-[12.5px] text-[var(--w-fg-neutral)]">{label}</span>
      {renderValue()}
    </div>
  );
}

export default function BrandProfileViewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  seedDemoIfEmpty();

  const { profiles } = useBrandProfilesStorage();
  const { personas } = usePersonasForProfile(id);
  const { products } = useProducts(id);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (profiles.length === 0 && !loaded) return;
    setLoaded(true);
    if (!profiles.find((p) => p.id === id)) {
      router.replace("/brand-profile");
    }
  }, [profiles, id, loaded, router]);

  if (!loaded) {
    return <div className="px-12 py-9 text-[var(--w-fg-neutral)]">불러오는 중…</div>;
  }

  const entry = profiles.find((p) => p.id === id);
  if (!entry) return null;

  const policy = entry.policy ?? [];
  const filledPolicy = SOP_SECTION_ORDER.filter((type) =>
    policy.some((s) => s.type === type && isSectionFilled(s))
  );

  return (
    <div className="px-12 py-9 pb-16 max-w-[900px] w-full mx-auto flex flex-col gap-6">
      {/* 헤더 */}
      <div>
        <Link
          href="/brand-profile"
          className="inline-flex items-center gap-1.5 font-medium text-[12.5px] text-[var(--w-fg-neutral)] hover:text-[var(--w-fg-strong)] transition-colors mb-3 no-underline"
        >
          <Icon name="arrow-left" size={13} /> 브랜드 프로필 목록
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="m-0 font-bold text-[28px] leading-[1.25] tracking-[-0.024em] text-[var(--w-fg-strong)]">
              {entry.name}
            </h1>
            {entry.isDefault && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--w-primary-soft)] font-semibold text-[12px] text-[var(--w-primary-normal)]">
                기본값
              </span>
            )}
          </div>
          <Link href={`/brand-profile/${id}/edit`}>
            <Button variant="secondary" type="button">수정</Button>
          </Link>
        </div>
      </div>

      {/* 스타일 */}
      <div className="flex flex-col gap-5">
        <ViewField label="광고 느낌" value={entry.tone} variant="chip" />
        <ViewField label="브랜드 설명" value={entry.brandDescription} variant="prose" />
        <ViewField label="브랜드 보이스" value={entry.brandVoice} variant="accent" />
        <ViewField label="브랜드 미감" value={entry.imageGuide} variant="accent-neutral" />
        <ViewField label="고객 목소리 요약" value={entry.customerVoiceSummary} variant="quote" />
        <CopyReferenceSection
          refs={entry.copyReferences ?? []}
          canEdit={false}
          onSave={() => {}}
        />
      </div>

      {/* 정책 */}
      <SectionLabel title="정책" />
      {filledPolicy.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {filledPolicy.map((type) => (
            <SopCard
              key={type}
              type={type}
              section={policy.find((s) => s.type === type)}
              canEdit={false}
              onEdit={() => {}}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 font-medium text-[13px] text-[var(--w-fg-alternative)] italic">미설정</p>
      )}

      {/* 페르소나 */}
      <SectionLabel title="페르소나" />
      {personas.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {personas.map((p) => (
            <PersonaCard
              key={p.id}
              persona={p}
              canEdit={false}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 font-medium text-[13px] text-[var(--w-fg-alternative)] italic">미설정</p>
      )}

      {/* 제품 */}
      <SectionLabel title="제품" />
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              canEdit={false}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 font-medium text-[13px] text-[var(--w-fg-alternative)] italic">미등록</p>
      )}
    </div>
  );
}
