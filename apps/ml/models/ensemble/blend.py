from __future__ import annotations

import numpy as np


def weighted_average_ensemble(predictions, cv_results, base_model_keys):
    weights = {k: max(cv_results[k]["mean"], 0.0) for k in base_model_keys}
    total   = max(sum(weights.values()), 1e-9)
    blended = sum(weights[k] * predictions[k] for k in base_model_keys) / total
    return np.clip(blended, 0, 100)


def compute_agreement(predictions, keys):
    matrix = np.column_stack([predictions[k] for k in keys])
    return np.std(matrix, axis=1)
