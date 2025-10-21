# backend/Predictive_Model_Tools/GWR/gwr_utils.py
import numpy as np
import pandas as pd

try:
    from statsmodels.stats.outliers_influence import variance_inflation_factor as sm_vif
    HAS_SM = True
except Exception:
    HAS_SM = False

def drop_zero_variance(df):
    keep = [c for c in df.columns if df[c].std(skipna=True) > 0]
    dropped = [c for c in df.columns if c not in keep]
    return df[keep], dropped

def drop_high_corr(df, thr=0.9):
    corr = df.corr().abs()
    upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
    to_drop = set()
    while True:
        max_corr = upper.max().max()
        if pd.isna(max_corr) or max_corr <= thr:
            break
        idx = upper.stack().idxmax()
        a, b = idx
        mean_a = upper[a].mean()
        mean_b = upper[b].mean()
        drop_col = a if mean_a >= mean_b else b
        to_drop.add(drop_col)
        df = df.drop(columns=[drop_col])
        corr = df.corr().abs()
        upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
    return df, sorted(list(to_drop))

def vif_prune(df, thr=3.0):
    if df.shape[1] <= 1:
        return df, []
    dropped = []
    X = (df - df.mean()) / df.std(ddof=0).replace(0, 1)
    while True:
        if X.shape[1] <= 1:
            break
        if HAS_SM:
            vifs = pd.Series([sm_vif(X.values, i) for i in range(X.shape[1])], index=X.columns)
        else:
            vifs = {}
            for col in X.columns:
                y = X[col].values.reshape(-1, 1)
                X_ = X.drop(columns=[col]).values
                XtX = X_.T @ X_ + 1e-8 * np.eye(X_.shape[1])
                beta = np.linalg.solve(XtX, X_.T @ y)
                yhat = X_ @ beta
                ssr = ((yhat - y.mean()) ** 2).sum()
                sst = ((y - y.mean()) ** 2).sum()
                r2 = min(max(ssr / sst if sst > 0 else 0.0, 0.999999))
                vifs[col] = 1.0 / (1.0 - r2)
            vifs = pd.Series(vifs)
        worst = vifs.idxmax()
        if vifs[worst] > thr:
            dropped.append(worst)
            X = X.drop(columns=[worst])
        else:
            break
    return df[X.columns.tolist()], dropped

def compute_vif_series(df):
    if df.shape[1] == 0:
        return pd.Series(dtype=float)
    X = (df - df.mean()) / df.std(ddof=0).replace(0, 1)
    if X.shape[1] == 1:
        return pd.Series([1.0], index=X.columns)
    if HAS_SM:
        vals = [sm_vif(X.values, i) for i in range(X.shape[1])]
        return pd.Series(vals, index=X.columns)
    return pd.Series({c: 1.0 for c in X.columns})

def ensure_full_rank(df):
    dropped = []
    while df.shape[1] > 0 and np.linalg.matrix_rank(df.values) < df.shape[1]:
        corr = df.corr().abs()
        np.fill_diagonal(corr.values, 0)
        avg_corr = corr.mean()
        victim = avg_corr.idxmax()
        dropped.append(victim)
        df = df.drop(columns=[victim])
    return df, dropped

def jitter_duplicate_coords(coords, amount=1e-3):
    xy = coords.copy()
    arr = xy.view([('', xy.dtype)] * xy.shape[1]).reshape(-1)
    _, counts = np.unique(arr, return_counts=True)
    if counts.max() <= 1:
        return xy
    key, inv, counts = np.unique(arr, return_inverse=True, return_counts=True)
    for k in np.where(counts > 1)[0]:
        idxs = np.where(inv == k)[0]
        for j, row_idx in enumerate(idxs):
            jitter = (j) * amount
            xy[row_idx, 0] += jitter
            xy[row_idx, 1] += jitter
    return xy
