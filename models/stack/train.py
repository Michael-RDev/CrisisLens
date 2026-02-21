import lightgbm as lgb
from sklearn.ensemble import (
    GradientBoostingRegressor,
    RandomForestRegressor,
    StackingRegressor,
)
from sklearn.linear_model import Ridge
from xgboost import XGBRegressor


def build_model():
    return StackingRegressor(
        estimators=[
            (
                "lgbm",
                lgb.LGBMRegressor(
                    n_estimators=400, learning_rate=0.04, max_depth=5,
                    num_leaves=24, subsample=0.80, colsample_bytree=0.80,
                    reg_alpha=0.1, reg_lambda=0.1, random_state=42, verbose=-1,
                ),
            ),
            (
                "rf",
                RandomForestRegressor(
                    n_estimators=200, max_depth=6, random_state=42, n_jobs=-1,
                ),
            ),
            (
                "xgb",
                XGBRegressor(
                    n_estimators=200, learning_rate=0.05, max_depth=5,
                    random_state=42, verbosity=0,
                ),
            ),
            (
                "gbr",
                GradientBoostingRegressor(
                    n_estimators=200, learning_rate=0.05, max_depth=4, random_state=42,
                ),
            ),
        ],
        final_estimator=Ridge(alpha=1.0),
        cv=5,
        passthrough=False,
        n_jobs=-1,
    )
