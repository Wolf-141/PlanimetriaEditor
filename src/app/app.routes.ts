import { Routes } from '@angular/router';
import { FloorPlanEditorComponent } from './floor-plan-editor/floor-plan-editor';

export const routes: Routes = [
    {
        path:'',
        redirectTo:'editor',
        pathMatch:'full'
    },
    {
        path:'editor',
        component: FloorPlanEditorComponent
    }
];
