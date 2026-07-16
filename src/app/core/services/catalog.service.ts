import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { CategoryInfo, Product, ProductCategory } from '../models/product.model';
import { CATEGORIES, MOCK_PRODUCTS } from '../data/mock-catalog';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  getCategories(): Observable<CategoryInfo[]> {
    if (environment.useMockData) {
      return of(CATEGORIES).pipe(delay(150));
    }

    return this.http
      .get<ApiResponse<CategoryInfo[]>>(`${environment.apiBaseUrl}/catalog/categories`)
      .pipe(map((res) => res.data));
  }

  getProducts(category?: ProductCategory): Observable<Product[]> {
    if (environment.useMockData) {
      const products = category
        ? MOCK_PRODUCTS.filter((p) => p.category === category && p.stockAvailable > 0)
        : MOCK_PRODUCTS.filter((p) => p.stockAvailable > 0);
      return of(products).pipe(delay(200));
    }

    let params = new HttpParams().set('machineId', environment.machineId);
    if (category) {
      params = params.set('category', category);
    }

    return this.http
      .get<ApiResponse<Product[]>>(`${environment.apiBaseUrl}/catalog/products`, { params })
      .pipe(map((res) => res.data));
  }

  getProductById(id: string): Observable<Product | undefined> {
    if (environment.useMockData) {
      return of(MOCK_PRODUCTS.find((p) => p.id === id)).pipe(delay(100));
    }

    return this.http
      .get<ApiResponse<Product>>(`${environment.apiBaseUrl}/catalog/products/${id}`)
      .pipe(map((res) => res.data));
  }

  getFeaturedProducts(): Observable<Product[]> {
    if (environment.useMockData) {
      return of(MOCK_PRODUCTS.filter((p) => p.featured && p.stockAvailable > 0)).pipe(delay(150));
    }

    const params = new HttpParams()
      .set('machineId', environment.machineId)
      .set('featured', 'true');

    return this.http
      .get<ApiResponse<Product[]>>(`${environment.apiBaseUrl}/catalog/products`, { params })
      .pipe(map((res) => res.data));
  }
}
