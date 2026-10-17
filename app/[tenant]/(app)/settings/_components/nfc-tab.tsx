"use client";

import { useState } from "react";
import { Repeat2, Smartphone } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { NfcCard, type NfcFinish } from "@/components/organisms/nfc-card";

export type CardOwner = { name: string; role: string; code: string };

/** Tarjeta de contacto NFC del negocio con tu nombre (vista previa interactiva). */
export default function NfcTab({ owner }: { owner: CardOwner }) {
  const { toast } = useToast();
  const [finish, setFinish] = useState<NfcFinish>("negro");
  const [readKey, setReadKey] = useState(0);
  const [reading, setReading] = useState(false);
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-[18px] py-4">
        <h2 className="font-display text-[15px] font-semibold">Tarjeta NFC</h2>
        <p className="text-xs text-muted-foreground">Muévela con el cursor o el dedo, tócala para girarla y simula acercar un teléfono.</p>
      </div>
      <div className="p-3">
        <NfcCard
          name={owner.name}
          role={owner.role}
          code={owner.code}
          finish={finish}
          readKey={readKey}
          onRead={() => {
            setReading(false);
            toast({ title: "Tarjeta leída", description: `${owner.name} · ${owner.role}`, variant: "success" });
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-[18px] py-3">
        <SegmentedControl
          ariaLabel="Acabado"
          value={finish}
          onChange={setFinish}
          options={[
            { value: "negro", label: "Negro" },
            { value: "blanco", label: "Blanco" },
          ]}
        />
        <span className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.querySelector<HTMLElement>('[aria-label^="Tarjeta NFC de"]')?.click()}
        >
          <Repeat2 aria-hidden="true" className="size-4" />
          Girar
        </Button>
        <Button
          size="sm"
          disabled={reading}
          onClick={() => {
            setReading(true);
            setReadKey((k) => k + 1);
          }}
        >
          <Smartphone aria-hidden="true" className="size-4" />
          Acercar teléfono
        </Button>
      </div>
    </section>
  );
}
