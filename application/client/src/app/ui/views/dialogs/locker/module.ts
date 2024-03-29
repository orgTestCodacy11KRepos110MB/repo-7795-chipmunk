import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LockerMessage } from './component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
    entryComponents: [LockerMessage],
    imports: [CommonModule, MatProgressSpinnerModule, MatIconModule, MatButtonModule],
    declarations: [LockerMessage],
    exports: [LockerMessage],
    bootstrap: [LockerMessage],
})
export class LockerMessageModule {}
