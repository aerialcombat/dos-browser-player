; SPDX-License-Identifier: GPL-2.0-only
; Copyright (C) 2026 DOS Browser Player contributors
; An original DOS COM demo. Build: nasm -f bin demo/demo.asm -o demo/demo.com
bits 16
org 100h
start:
    call load
loop:
    mov ax, 3
    int 10h
    mov dx, banner
    call print
    mov dx, score_text
    call print
    mov dl, [score]
    mov ah, 2
    int 21h
    mov dx, prompt
    call print
    mov ah, 1
    int 21h
    cmp al, ' '
    je add_point
    or al, 20h
    cmp al, 's'
    je save
    cmp al, 'l'
    je reload
    cmp al, 'q'
    je quit
    jmp loop
add_point:
    cmp byte [score], '9'
    je loop
    inc byte [score]
    jmp loop
reload:
    call load
    jmp loop
save:
    mov dx, filename
    xor cx, cx
    mov ah, 3ch
    int 21h
    jc failure
    mov bx, ax
    mov dx, score
    mov cx, 1
    mov ah, 40h
    int 21h
    pushf
    push ax
    mov ah, 3eh
    int 21h
    pop ax
    popf
    jc failure
    cmp ax, 1
    jne failure
    mov dx, saved
    call print
    jmp loop
failure:
    mov dx, failed
    call print
    jmp loop
quit:
    mov ax, 4c00h
    int 21h
load:
    mov dx, filename
    mov ax, 3d00h
    int 21h
    jc .done
    mov bx, ax
    mov dx, input
    mov cx, 1
    mov ah, 3fh
    int 21h
    pushf
    push ax
    mov ah, 3eh
    int 21h
    pop ax
    popf
    jc .done
    cmp ax, 1
    jne .done
    mov al, [input]
    cmp al, '0'
    jb .done
    cmp al, '9'
    ja .done
    mov [score], al
.done:
    ret
print:
    mov ah, 9
    int 21h
    ret
banner db 'DOS Browser Player - open source demo',13,10
       db 'Copyright (C) 2026 DOS Browser Player contributors',13,10
       db 'GPL v2; no warranty. See LICENSE in the player directory.',13,10
       db 'SPACE adds a point (up to 9), S saves, L loads, Q quits.',13,10
       db 'After S, use Save to browser or download a backup.',13,10,'$'
score_text db 13,10,'Points: $'
prompt db 13,10,'[SPACE / S / L / Q] > $'
saved db 13,10,'Saved DEMO.SAV.',13,10,'$'
failed db 13,10,'Could not save DEMO.SAV.',13,10,'$'
filename db 'DEMO.SAV',0
score db '0'
input db 0
