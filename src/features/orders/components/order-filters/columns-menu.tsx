"use client";

import { Columns3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BOARD_COLUMN_OPTIONS, toggleHiddenColumn } from "@/features/orders/board-columns";
import { useUiStore } from "@/stores/ui-store";

/**
 * «Ustunlar» — logist doskada qaysi ustunlar ko'rinishini o'zi tanlaydi
 * (Bitrix'dagi «Настроить колонки»). Tanlov brauzerda saqlanadi.
 */
export function ColumnsMenu() {
  const hidden = useUiStore((state) => state.hiddenBoardColumns);
  const setHidden = useUiStore((state) => state.setHiddenBoardColumns);
  const shown = BOARD_COLUMN_OPTIONS.length - hidden.filter((value) => BOARD_COLUMN_OPTIONS.some((option) => option.value === value)).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" title="Doskada ko'rinadigan ustunlar">
          <Columns3 className="size-4" />
          <span className="hidden sm:inline">Ustunlar</span>
          {hidden.length > 0 ? <span className="text-ink-muted tabular">{`${shown}/${BOARD_COLUMN_OPTIONS.length}`}</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Ko&apos;rinadigan ustunlar</DropdownMenuLabel>
        {BOARD_COLUMN_OPTIONS.map((option) => {
          const checked = !hidden.includes(option.value);
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={checked}
              disabled={checked && shown <= 1}
              // Bir nechtasini ketma-ket belgilash uchun menyu yopilmaydi.
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => setHidden(toggleHiddenColumn(hidden, option.value))}
            >
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: option.mark }} />
              {option.label}
            </DropdownMenuCheckboxItem>
          );
        })}
        {hidden.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setHidden([])}>Hammasini ko&apos;rsatish</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
