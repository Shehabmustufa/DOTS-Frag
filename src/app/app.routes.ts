import { Routes } from '@angular/router';
import { DashboardLayout } from './layout/dashboard-layout/dashboard-layout';
import { Perfumes } from './pages/perfumes/perfumes';
import { Orders } from './pages/orders/orders';
import { Customers } from './pages/customers/customers';
import { Costs } from './pages/costs/costs';
import { Brands } from './pages/brands/brands';

export const routes: Routes = [
  {
    path: '',
    component: DashboardLayout,
    children: [
      { path: 'perfumes', component: Perfumes },
      { path: 'orders', component: Orders },
      { path: 'customers', component: Customers },
      { path: 'costs', component: Costs },
      { path: 'brands', component: Brands },
      { path: '', redirectTo: 'perfumes', pathMatch: 'full' },
    ]
  }
];
