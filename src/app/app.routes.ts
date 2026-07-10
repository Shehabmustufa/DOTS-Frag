import { Routes } from '@angular/router';
import { DashboardLayout } from './layout/dashboard-layout/dashboard-layout';
import { Perfumes } from './pages/perfumes/perfumes';
import { Orders } from './pages/orders/orders';
import { Customers } from './pages/customers/customers';
import { Costs } from './pages/costs/costs';
import { Brands } from './pages/brands/brands';
import { Login } from './pages/login/login';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard],
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
