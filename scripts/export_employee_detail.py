#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF-Export für Mitarbeiter-Detailansicht
Erstellt eine formatierte PDF mit Urlaubs- und Abwesenheitsdaten eines einzelnen Mitarbeiters
"""

import sys
import json
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


def create_employee_detail_pdf(employee_data, vacation_data, absence_data, output_path):
    """
    Erstellt eine detaillierte PDF für einen Mitarbeiter
    
    Args:
        employee_data: Dict mit Mitarbeiterdaten (name, department, etc.)
        vacation_data: Liste mit Urlaubseinträgen
        absence_data: Liste mit Abwesenheitseinträgen
        output_path: Pfad zur Output-PDF
    """
    
    # PDF-Dokument erstellen (A4 Hochformat)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1F538D'),
        spaceAfter=12,
        alignment=1  # Center
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1F538D'),
        spaceAfter=10,
        spaceBefore=15
    )
    
    info_style = ParagraphStyle(
        'InfoStyle',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=6
    )
    
    # Titel
    title = Paragraph(f"Urlaubsübersicht: {employee_data.get('name', 'Unbekannt')}", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.3*cm))
    
    # Mitarbeiter-Informationen
    info_text = f"""
    <b>Abteilung:</b> {employee_data.get('department', 'Keine Abteilung')}<br/>
    <b>Urlaubsanspruch:</b> {employee_data.get('entitlement', 0)} Tage<br/>
    <b>Übertrag:</b> {employee_data.get('carryover', 0)} Tage<br/>
    <b>Verfügbar:</b> {employee_data.get('available', 0)} Tage<br/>
    <b>Genommen:</b> {employee_data.get('taken', 0)} Tage<br/>
    <b>Verbleibend:</b> {employee_data.get('remaining', 0)} Tage
    """
    info_para = Paragraph(info_text, info_style)
    elements.append(info_para)
    elements.append(Spacer(1, 0.5*cm))
    
    # Urlaubseinträge
    if vacation_data and len(vacation_data) > 0:
        vacation_title = Paragraph("Urlaubseinträge", subtitle_style)
        elements.append(vacation_title)
        
        # Tabellen-Header
        vacation_table_data = [['Von', 'Bis', 'Tage', 'Status', 'Notiz']]
        
        # Sortiere nach Startdatum (neueste zuerst)
        sorted_vacation = sorted(vacation_data, key=lambda x: x.get('startDate', ''), reverse=True)
        
        for entry in sorted_vacation:
            start = entry.get('startDate', '')
            end = entry.get('endDate', '')
            days = entry.get('days', 0)
            status = entry.get('status', 'Unbekannt')
            note = entry.get('note', '')
            
            # Formatiere Datum
            try:
                start_formatted = datetime.strptime(start, '%Y-%m-%d').strftime('%d.%m.%Y')
            except:
                start_formatted = start
            
            try:
                end_formatted = datetime.strptime(end, '%Y-%m-%d').strftime('%d.%m.%Y')
            except:
                end_formatted = end
            
            # Status auf Deutsch
            status_de = {
                'approved': 'Genehmigt',
                'pending': 'Ausstehend',
                'rejected': 'Abgelehnt'
            }.get(status, status)
            
            vacation_table_data.append([
                start_formatted,
                end_formatted,
                str(days),
                status_de,
                note[:30] + '...' if len(note) > 30 else note
            ])
        
        # Erstelle Tabelle
        vacation_table = Table(vacation_table_data, colWidths=[3*cm, 3*cm, 2*cm, 3*cm, 6*cm])
        vacation_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F538D')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            
            # Daten
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (2, -1), 'CENTER'),  # Von, Bis, Tage zentriert
            ('ALIGN', (3, 1), (-1, -1), 'LEFT'),    # Status, Notiz links
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(vacation_table)
        elements.append(Spacer(1, 0.8*cm))
    else:
        no_vacation = Paragraph("Keine Urlaubseinträge vorhanden", info_style)
        elements.append(no_vacation)
        elements.append(Spacer(1, 0.5*cm))
    
    # Abwesenheitseinträge (Krankheit, Schulung, etc.)
    if absence_data and len(absence_data) > 0:
        absence_title = Paragraph("Abwesenheitseinträge", subtitle_style)
        elements.append(absence_title)
        
        # Tabellen-Header
        absence_table_data = [['Datum', 'Typ', 'Tage', 'Notiz']]
        
        # Sortiere nach Datum (neueste zuerst)
        sorted_absence = sorted(absence_data, key=lambda x: x.get('date', ''), reverse=True)
        
        for entry in sorted_absence:
            date = entry.get('date', '')
            typ = entry.get('type', '')
            days = entry.get('days', 0)
            note = entry.get('note', '')
            
            # Formatiere Datum
            try:
                date_formatted = datetime.strptime(date, '%Y-%m-%d').strftime('%d.%m.%Y')
            except:
                date_formatted = date
            
            # Typ auf Deutsch
            type_de = {
                'sick': 'Krankheit',
                'training': 'Schulung',
                'other': 'Sonstiges'
            }.get(typ, typ)
            
            absence_table_data.append([
                date_formatted,
                type_de,
                str(days),
                note[:40] + '...' if len(note) > 40 else note
            ])
        
        # Erstelle Tabelle
        absence_table = Table(absence_table_data, colWidths=[3*cm, 3*cm, 2*cm, 9*cm])
        absence_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F538D')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            
            # Daten
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (2, -1), 'CENTER'),  # Datum, Typ, Tage zentriert
            ('ALIGN', (3, 1), (-1, -1), 'LEFT'),    # Notiz links
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(absence_table)
    else:
        no_absence = Paragraph("Keine Abwesenheitseinträge vorhanden", info_style)
        elements.append(no_absence)
    
    # Fußzeile mit Datum
    elements.append(Spacer(1, 1*cm))
    footer_text = f"Erstellt am: {datetime.now().strftime('%d.%m.%Y um %H:%M Uhr')}"
    footer = Paragraph(footer_text, ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey))
    elements.append(footer)
    
    # PDF erstellen
    doc.build(elements)
    sys.stdout.buffer.write(f"PDF erfolgreich erstellt: {output_path}\n".encode('utf-8'))


def main():
    if len(sys.argv) != 3:
        sys.stderr.buffer.write(b"FEHLER: Falsche Anzahl Parameter!\n")
        sys.stderr.buffer.write(b"Usage: python export_employee_detail.py <input.json> <output.pdf>\n")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    # JSON lesen
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        sys.stdout.buffer.write(f"JSON gelesen: Mitarbeiter {data.get('employee', {}).get('name', 'Unbekannt')}\n".encode('utf-8'))
    except Exception as e:
        sys.stderr.buffer.write(f"FEHLER beim Lesen der JSON: {str(e)}\n".encode('utf-8'))
        sys.exit(1)
    
    # Daten extrahieren
    employee_data = data.get('employee', {})
    vacation_data = data.get('vacation', [])
    absence_data = data.get('absence', [])
    
    # PDF erstellen
    try:
        create_employee_detail_pdf(employee_data, vacation_data, absence_data, output_file)
    except Exception as e:
        sys.stderr.buffer.write(f"FEHLER beim Erstellen der PDF: {str(e)}\n".encode('utf-8'))
        sys.exit(1)


if __name__ == '__main__':
    main()