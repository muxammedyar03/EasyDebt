"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditLogTableProps } from "@/types/types";
import { useTableUtils } from "../utils/useTableUtils";

export interface AuditLogsTableProps {
  logs: AuditLogTableProps[];
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  const { getActionBadge, getEntityTypeName, formatDate, getActionDescription } = useTableUtils();

  const [descriptions, setDescriptions] = React.useState<Record<number, string | null>>({});

  React.useEffect(() => {
    let isMounted = true;

    const loadDescriptions = async () => {
      const entries = await Promise.all(logs.map(async (log) => [log.id, await getActionDescription(log)] as const));

      if (!isMounted) return;

      setDescriptions(Object.fromEntries(entries));
    };

    loadDescriptions();

    return () => {
      isMounted = false;
    };
  }, [logs, getActionDescription]);

  return (
    <Card className="py-0 pt-6">
      <CardHeader className="px-2">
        <CardTitle>Oxirgi 100 ta harakat</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        {/* Mobile View */}
        <div className="space-y-4 md:hidden">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    {getActionBadge(log.action)}
                    <span className="text-muted-foreground text-xs">{formatDate(log.created_at)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {log.user ? `${log.user.username} (${log.user.email})` : "Tizim"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {getEntityTypeName(log.entity_type)}
                      {log.entity_id && ` #${log.entity_id}`}
                    </p>
                  </div>
                  {descriptions[log.id] && <p className="text-muted-foreground text-xs">{descriptions[log.id]}</p>}
                  {log.ip_address && (
                    <p className="text-muted-foreground text-xs">
                      <span className="font-medium">IP:</span> {log.ip_address}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sana</TableHead>
                <TableHead>Foydalanuvchi</TableHead>
                <TableHead>Harakat</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Tafsilotlar</TableHead>
                {/* <TableHead>IP Address</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Ma&apos;lumot topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                    <TableCell>
                      {log.user ? (
                        <div>
                          <p className="font-medium">
                            {log.user.first_name && log.user.last_name
                              ? `${log.user.first_name} ${log.user.last_name}`
                              : log.user.username}
                          </p>
                          <p className="text-muted-foreground text-xs">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Tizim</span>
                      )}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getEntityTypeName(log.entity_type)}</p>
                        {log.entity_id && <p className="text-muted-foreground text-xs">ID: {log.entity_id}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {descriptions[log.id] && <p className="text-muted-foreground text-xs">{descriptions[log.id]}</p>}
                    </TableCell>
                    {/* <TableCell className="text-muted-foreground text-sm">{log.ip_address || "-"}</TableCell> */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
