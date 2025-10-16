"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditLogTableProps } from "@/types/types";

interface AuditLogsTableProps {
  logs: AuditLogTableProps[];
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-green-500">Yaratildi</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-500">Yangilandi</Badge>;
      case "DELETE":
        return <Badge variant="destructive">O&apos;chirildi</Badge>;
      case "LOGIN":
        return <Badge className="bg-purple-500">Kirish</Badge>;
      case "LOGOUT":
        return <Badge variant="secondary">Chiqish</Badge>;
      case "PAYMENT_ADDED":
        return <Badge className="bg-emerald-500">To&apos;lov</Badge>;
      case "DEBT_ADDED":
        return <Badge className="bg-orange-500">Qarz</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getEntityTypeName = (type: string) => {
    switch (type) {
      case "Debtor":
        return "Qarzdor";
      case "Debt":
        return "Qarz";
      case "Payment":
        return "To'lov";
      case "User":
        return "Foydalanuvchi";
      case "Settings":
        return "Sozlamalar";
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Oxirgi 100 ta harakat</CardTitle>
      </CardHeader>
      <CardContent>
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
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
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
                    <TableCell className="text-muted-foreground text-sm">{log.ip_address || "-"}</TableCell>
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
