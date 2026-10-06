'use client';

import { useRef, useState } from 'react';
import {
  AdminApiError,
  changedFields,
  createProduct,
  deleteImage,
  formToNewProduct,
  patchProduct,
  uploadImage,
  validateProductForm,
  type AdminBattery,
  type ProductFormError,
  type ProductFormValues,
  type Segment,
  type Tech,
} from '@/lib/admin-api';
import { MAX_SIDE_PX, resizeDims, UPLOAD_QUALITY } from '@/lib/images';
import RequestError from './RequestError';
import { labels } from './labels';

const t = labels.stock;

const TECHS: Tech[] = ['SMF', 'EFB', 'AGM', 'DEEP-CYCLE'];

const ERR_TEXT: Record<ProductFormError, string> = {
  brand: labels.stock.errBrand,
  name: labels.stock.errName,
  ah: labels.stock.errAh,
  cca: labels.stock.errCca,
  polarity: labels.stock.errPolarity,
  caseCode: labels.stock.errCaseCode,
  dims: labels.stock.errDims,
  warranty: labels.stock.errWarranty,
  price: labels.stock.errPrice,
  costPrice: labels.stock.errCostPrice,
  quantity: labels.stock.errQuantity,
};

function initialValues(battery: AdminBattery | null): ProductFormValues {
  if (!battery) {
    return {
      brand: 'AMPER', name: '', segment: 'car', tech: 'SMF', ah: '', cca: '', polarity: '', caseCode: '',
      dimL: '', dimW: '', dimH: '', warrantyMonths: '24', price: '', costPrice: '', quantity: '0', oemCodes: '',
    };
  }
  return {
    brand: battery.brand, name: battery.name, segment: battery.segment, tech: battery.tech,
    ah: String(battery.ah), cca: String(battery.cca), polarity: battery.polarity as 'L+' | 'R+',
    caseCode: battery.caseCode, dimL: String(battery.dimsMm.l), dimW: String(battery.dimsMm.w), dimH: String(battery.dimsMm.h),
    warrantyMonths: String(battery.warrantyMonths), price: battery.price === null ? '' : String(battery.price),
    costPrice: battery.costPrice === null || battery.costPrice === undefined ? '' : String(battery.costPrice),
    quantity: battery.quantity === undefined ? '' : String(battery.quantity),
    oemCodes: battery.oemCodes.join('\n'),
  };
}

interface Props {
  initial: AdminBattery | null;
  caseCodes: string[];
  onClose: () => void;
  onSaved: (name: string) => void;
  onImages?: (id: string, images: string[]) => void;
}

async function resizeToWebp(file: File): Promise<{ blob: Blob; name: string }> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = resizeDims(bitmap.width, bitmap.height, MAX_SIDE_PX);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const base = file.name.replace(/\.[a-z0-9]+$/i, '') || 'photo';
    const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', UPLOAD_QUALITY));
    if (webp && webp.size > 0) return { blob: webp, name: `${base}.webp` };
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', UPLOAD_QUALITY));
    if (jpeg && jpeg.size > 0) return { blob: jpeg, name: `${base}.jpg` };
    throw new Error('encode failed');
  } finally {
    bitmap.close();
  }
}

export default function ProductForm({ initial, caseCodes, onClose, onSaved, onImages }: Props) {
  const isAdd = initial === null;
  const [values, setValues] = useState<ProductFormValues>(() => initialValues(initial));
  const [errors, setErrors] = useState<ProductFormError[]>([]);
  const [submitError, setSubmitError] = useState<AdminApiError | null>(null);
  const [conflict, setConflict] = useState(false);
  const [noChanges, setNoChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [confirmPhoto, setConfirmPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<AdminApiError | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => e.filter((f) => f !== key && !(key.startsWith('dim') && f === 'dims')));
    setNoChanges(false);
  }

  function err(field: ProductFormError) {
    const hit = errors.find((f) => f === field);
    if (!hit) return null;
    return (
      <p className="admin-ferr" role="alert">
        {ERR_TEXT[hit]}
      </p>
    );
  }

  async function uploadFiles(list: FileList | null) {
    if (!initial || !list || uploading) return;
    const files = [...list].slice(0, Math.max(0, 6 - images.length));
    if (fileRef.current) fileRef.current.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setPhotoError(null);
    try {
      let current = images;
      for (const file of files) {
        const { blob, name } = await resizeToWebp(file);
        const res = await uploadImage(initial.id, new File([blob], name, { type: blob.type }));
        current = res.images;
      }
      setImages(current);
      onImages?.(initial.id, current);
    } catch (e) {
      setPhotoError(e as AdminApiError);
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(url: string) {
    if (!initial) return;
    try {
      const res = await deleteImage(initial.id, url);
      setImages(res.images);
      onImages?.(initial.id, res.images);
      setConfirmPhoto(null);
    } catch (e) {
      setPhotoError(e as AdminApiError);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const found = validateProductForm(values, { quantity: isAdd });
    setErrors(found);
    if (found.length > 0) return;
    setSaving(true);
    setSubmitError(null);
    setConflict(false);
    try {
      if (isAdd) {
        const { battery } = await createProduct(formToNewProduct(values));
        onSaved(battery.name);
      } else if (initial) {
        const patch = changedFields(initial, values);
        if (Object.keys(patch).length === 0) {
          setNoChanges(true);
          return;
        }
        const { battery } = await patchProduct(initial.id, patch);
        onSaved(battery.name);
      }
    } catch (e) {
      const apiErr = e as AdminApiError;
      if (apiErr.code === 'conflict') setConflict(true);
      else setSubmitError(apiErr);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(e) => void submit(e)} noValidate>
      <div className="admin-grid">
        <div className="field">
          <label htmlFor="pf-brand">{t.brand}</label>
          <input type="text" id="pf-brand" autoComplete="off" value={values.brand} onChange={(e) => set('brand', e.target.value)} />
          {err('brand')}
        </div>
        <div className="field">
          <label htmlFor="pf-name">{t.name}</label>
          <input type="text" id="pf-name" autoComplete="off" value={values.name} onChange={(e) => set('name', e.target.value)} />
          {err('name')}
        </div>
        <div className="field">
          <label htmlFor="pf-segment">{t.segment}</label>
          <select id="pf-segment" value={values.segment} onChange={(e) => set('segment', e.target.value as Segment)}>
            <option value="car">{t.segCar}</option>
            <option value="truck">{t.segTruck}</option>
            <option value="moto">{t.segMoto}</option>
            <option value="deep">{t.segDeep}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="pf-tech">{t.tech}</label>
          <select id="pf-tech" value={values.tech} onChange={(e) => set('tech', e.target.value as Tech)}>
            {TECHS.map((tech) => (
              <option key={tech} value={tech}>
                {tech}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pf-ah">{t.ah}</label>
          <input type="number" id="pf-ah" min={0} step="any" value={values.ah} onChange={(e) => set('ah', e.target.value)} />
          {err('ah')}
        </div>
        <div className="field">
          <label htmlFor="pf-cca">{t.cca}</label>
          <input type="number" id="pf-cca" min={0} step="any" value={values.cca} onChange={(e) => set('cca', e.target.value)} />
          {err('cca')}
        </div>
      </div>
      <div className="field">
        <span id="pf-pol-label">{t.polarity}</span>
        <div className="chan-pick" role="radiogroup" aria-labelledby="pf-pol-label">
          {(['L+', 'R+'] as const).map((p) => (
            <span key={p}>
              <input type="radio" name="pf-pol" id={`pf-pol-${p === 'L+' ? 'l' : 'r'}`} value={p} checked={values.polarity === p} onChange={() => set('polarity', p)} />
              <label htmlFor={`pf-pol-${p === 'L+' ? 'l' : 'r'}`}>{p}</label>
            </span>
          ))}
        </div>
        {err('polarity')}
      </div>
      <div className="admin-grid">
        <div className="field">
          <label htmlFor="pf-case">{t.caseCode}</label>
          <input
            type="text"
            id="pf-case"
            className="code-input"
            autoComplete="off"
            list="pf-casecodes"
            placeholder={t.caseCodeHint}
            value={values.caseCode}
            onChange={(e) => set('caseCode', e.target.value)}
          />
          <datalist id="pf-casecodes">
            {caseCodes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {err('caseCode')}
        </div>
        <div className="field">
          <label htmlFor="pf-warranty">{t.warranty}</label>
          <input type="number" id="pf-warranty" min={0} step={1} value={values.warrantyMonths} onChange={(e) => set('warrantyMonths', e.target.value)} />
          {err('warranty')}
        </div>
        <div className="field">
          <label htmlFor="pf-price">{t.priceInput}</label>
          <input
            type="number"
            id="pf-price"
            min={0}
            step="0.01"
            placeholder={t.priceHint}
            value={values.price}
            onChange={(e) => set('price', e.target.value)}
          />
          {err('price')}
        </div>
        <div className="field">
          <label htmlFor="pf-cost">{t.costPrice}</label>
          <input type="number" id="pf-cost" min={0} step="0.01" value={values.costPrice} onChange={(e) => set('costPrice', e.target.value)} />
          {err('costPrice')}
        </div>
      </div>
      <div className="field">
        <span id="pf-dims-label">{t.dims}</span>
        <div className="admin-grid" role="group" aria-labelledby="pf-dims-label">
          <div className="field">
            <label htmlFor="pf-diml">{t.dimL}</label>
            <input type="number" id="pf-diml" min={0} step="any" value={values.dimL} onChange={(e) => set('dimL', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-dimw">{t.dimW}</label>
            <input type="number" id="pf-dimw" min={0} step="any" value={values.dimW} onChange={(e) => set('dimW', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-dimh">{t.dimH}</label>
            <input type="number" id="pf-dimh" min={0} step="any" value={values.dimH} onChange={(e) => set('dimH', e.target.value)} />
          </div>
        </div>
        {err('dims')}
      </div>
      {isAdd ? (
        <div className="field">
          <label htmlFor="pf-qty">{t.openingQty}</label>
          <input type="number" id="pf-qty" min={0} step={1} value={values.quantity} onChange={(e) => set('quantity', e.target.value)} />
          {err('quantity')}
        </div>
      ) : (
        <p className="admin-hint">
          {t.currentQty}: <b>{initial?.quantity ?? t.notAvailable}</b> — {t.qtyHint}
        </p>
      )}
      <div className="field">
        <label htmlFor="pf-oem">{t.oemCodes}</label>
        <textarea id="pf-oem" placeholder={t.oemHint} value={values.oemCodes} onChange={(e) => set('oemCodes', e.target.value)} />
      </div>
      {!isAdd && initial && (
        <div className="field">
          <span id="pf-photos-label">{t.photos}</span>
          <div className="photo-thumbs" role="group" aria-labelledby="pf-photos-label">
            {images.map((url, i) => (
              <figure key={url} className="photo-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail, no optimisation needed */}
                <img src={url} alt={`${t.photoAlt} ${i + 1}`} width={192} height={144} loading="lazy" />
                {confirmPhoto === url ? (
                  <span className="photo-confirm">
                    <span>{t.photoConfirmDelete}</span>
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => void removePhoto(url)}>
                      {t.remove}
                    </button>
                    <button className="btn btn-line btn-sm" type="button" onClick={() => setConfirmPhoto(null)}>
                      {t.cancel}
                    </button>
                  </span>
                ) : (
                  <button
                    className="btn btn-line btn-sm"
                    type="button"
                    aria-label={`${t.photoDelete} ${i + 1}`}
                    onClick={() => setConfirmPhoto(url)}
                  >
                    {t.remove}
                  </button>
                )}
              </figure>
            ))}
          </div>
          {images.length < 6 ? (
            <div className="field">
              <label htmlFor="pf-upload">{t.photoUpload}</label>
              <input
                ref={fileRef}
                type="file"
                id="pf-upload"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => void uploadFiles(e.target.files)}
              />
            </div>
          ) : (
            <p className="admin-hint">{t.photoMax}</p>
          )}
          {uploading && (
            <p className="admin-hint" role="status">
              {labels.loading}
            </p>
          )}
          {photoError && <RequestError error={photoError} />}
        </div>
      )}
      {conflict && (
        <p className="admin-ferr" role="alert">
          {t.conflict}
        </p>
      )}
      {noChanges && (
        <p className="admin-hint" role="status">
          {t.noChanges}
        </p>
      )}
      {submitError && <RequestError error={submitError} />}
      <div className="admin-row-actions">
        <button className="btn btn-solid btn-sm" type="submit" disabled={saving}>
          {t.save}
        </button>
        <button className="btn btn-line btn-sm" type="button" onClick={onClose}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
